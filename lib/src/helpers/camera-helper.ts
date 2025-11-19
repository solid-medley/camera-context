
import {
	MediaPermissionsError,
	MediaPermissionsErrorType,
	requestMediaPermissions
} from 'mic-check'
import { Camera, DeviceResult, FlatMediaDeviceInfo, MediaPermission, UserMediaState } from '../data-models/device'
import { getBrowserMetadata } from './browser-metadata'
import { errorToString, logModule } from './debug-helper';
import { features } from '../constants';

logModule('camera-helper', import.meta)

function getLocalStorageName(appName: string, key: string) {
	return `${key}@${appName}`
}

function getStoredCameraId(appName: string) {
	return localStorage.getItem(getLocalStorageName(appName, 'camera')) ?? undefined
}

function storeCameraId(appName: string, id: string | undefined) {
	if (!id) return localStorage.removeItem(getLocalStorageName(appName, 'camera'))
	return localStorage.setItem(getLocalStorageName(appName, 'camera'), id)
}

function combineConstraints(constraints: MediaStreamConstraints, deviceId?: string | undefined): MediaStreamConstraints {
	return {
		...constraints,
		video: {
			...constraints.video as MediaTrackConstraints,
			deviceId: {
				// We store the camera, if audio is available it's almost always the same device.
				// If separate audio is necessary you may file a feature request
				exact: deviceId
			}
		}
	}
}

async function getDevices(): Promise<DeviceResult> {
	if (!navigator.mediaDevices?.enumerateDevices) return {
		videoDevices: undefined
	}

	try {
		const devices = await navigator.mediaDevices?.enumerateDevices() as InputDeviceInfo[]
		const videoDevices = devices
			.filter(device => device.kind === 'videoinput')
			.map(flatDeviceInput)
		return {
			videoDevices
		}
	} catch (err) {
		// This may happen when the tab falls asleep and we try to list devices.
		// The "user interaction" is no longer valid then.
		if ((err as Error).message.includes('Illegal invocation')) return {
			videoDevices: []
		}
		throw err
	}
}

type RequestResult = [permission: MediaPermission, camera?: Camera | undefined];
export async function requestMediaPermission(
	constraints: MediaStreamConstraints, enumerateDevices: boolean, appName: string
) : Promise<UserMediaState> {
	

	const storedCamera = getStoredCameraId(appName)
	const combinedConstraints = combineConstraints(constraints, storedCamera)

	const [permission, camera] = await requestMediaPermissions(combinedConstraints)
		.then(async (success) => {
			// @ts-expect-error // TODO figure out when this happens
			if (!success) return ['denied-unknown'] as RequestResult

			// Just try this once to see if the stream starts, retry stored camera in case it changed
			return [
				'granted', 
				await getCamera(combinedConstraints, appName)
			] as RequestResult
		})
		.catch((err: MediaPermissionsError) => [handleMediaPermissionsError(err, appName)] as RequestResult)
		
	const devices = enumerateDevices ? await getDevices() : undefined
	return {
		permission,
		camera,
		devices
	}
}

/** 
 * NOTE! \
 * If there are still `debugger;` statements in this function, that means we haven't encountered them yet \
 * If no more `debugger;` statements are left, this comment may be deleted.
 */
function handleMediaPermissionsError(err: MediaPermissionsError, appName: string): MediaPermission {
	const { type, message, name } = err
	const storedCamera = getStoredCameraId(appName);

	if (type === MediaPermissionsErrorType.SystemPermissionDenied) {
		// browser does not have permission to access camera or microphone
		return 'denied:system'
	} else if (type === MediaPermissionsErrorType.UserPermissionDenied) {
		// user didn't allow app to access camera or microphone
		return 'denied'
	} else if (type === MediaPermissionsErrorType.CouldNotStartVideoSource) {
		if (features.DEBUG_ERROR_ALERT) alert('error:inuse \n' + errorToString(err))
		// camera is in use by another application (Zoom, Skype) or browser tab (Google Meet, Messenger Video)
		// (mostly Windows specific problem)
		debugger;
		return 'error:inuse'
	} else if (name === 'AbortError' && message === "Starting videoinput failed") {
		if (features.DEBUG_ERROR_ALERT) alert('error:inuse \n' + errorToString(err))
		// Failed to start
		return 'error:inuse'
	} else if (name === 'NotReadableError') {
		if (features.DEBUG_ERROR_ALERT) alert('error:inuse \n' + errorToString(err))
		// Stream rejected reading data
		return 'error:inuse'
	} else if (type === MediaPermissionsErrorType.Generic && message === "Permission dismissed") {
		// prompt dismissed by user
		return 'unknown'
	} else if (name === "OverconstrainedError" && ((err as OverconstrainedError).constraint === "deviceId" || message === "")
		&& storedCamera) {
		if (features.DEBUG_ERROR_ALERT) alert('error:inuse \n' + errorToString(err))
		// This seems to happen when the browser stores a camera that doesn't exist (perhaps the ideas change on software update)
		// Erase storage and reload
		storeCameraId(appName, undefined);
		return 'error:inuse'
	} else {
		if (features.DEBUG_ERROR_ALERT) alert('error:unexpected \n' + errorToString(err))
		console.error(err)
		// not all error types are handled by this library
		debugger;
		return 'error:unexpected'
	}
}


async function getCamera(constraints: MediaStreamConstraints, appName: string, id?: string): Promise<Camera> {

	const storedCamera = getStoredCameraId(appName)
	const requestedCamera = id ?? storedCamera ?? undefined
	const deviceConstraints = combineConstraints(constraints, requestedCamera);

	const mediaStream = await navigator.mediaDevices.getUserMedia(deviceConstraints)
		.catch(error => {
			if (error.name === 'NotReadableError') {
				if (features.DEBUG_ERROR_ALERT) alert('NOTREADABLE \n' + errorToString(error))
				// Sometimes the browser doesn't close the stream on mobile devices
				// To solve this we store and redirect.
				// TODO: see how this works in iframe
				debugger;
				storeCameraId(appName, requestedCamera)
				throw error
			}
			const [result] = handleMediaPermissionsError(error as MediaPermissionsError, appName)
			if (result === 'error') throw error
			return undefined
		})

	if (!mediaStream) return {
		id: requestedCamera!,
		label: '?',
		facing: 'loading',
		name: '',
		stream: undefined
	}

	if (!mediaStream.active || !mediaStream.getTracks()) {
		storeCameraId(appName, requestedCamera!)
		return {
			id: requestedCamera!,
			label: 'X',
			facing: 'loading',
			name: 'X',
			stream: undefined
		}
	}

	const deviceId = mediaStream.getVideoTracks()[0].getSettings().deviceId!
	storeCameraId(appName, deviceId)

	return {
		id: deviceId,
		name: mediaStream.getVideoTracks()[0].label,
		label: mediaStream.getVideoTracks()[0].label.split('(')[0].split(',')[0].trim(),
		facing: getBrowserMetadata().platform.type === 'desktop'
			? 'desktop' :
			mediaStream.getVideoTracks()[0].getSettings().facingMode as 'user' | 'environment',
		stream: mediaStream
	}
}
function flatDeviceInput(inputDevice: InputDeviceInfo): FlatMediaDeviceInfo {
	return {
		deviceId: inputDevice.deviceId,
		groupId: inputDevice.groupId,
		kind: inputDevice.kind,
		label: inputDevice.label,
		capabilities: inputDevice.getCapabilities()
	}
}

