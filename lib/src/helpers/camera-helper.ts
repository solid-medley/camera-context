
import {
	MediaPermissionsError,
	MediaPermissionsErrorType,
	requestMediaPermissions
} from 'mic-check'
import { Camera, DeviceResult, FlatMediaDeviceInfo, MediaPermission, UserMediaState } from '../data-models/device'
import { getBrowserMetadata } from './browser-metadata'

// TODO TEMP: THIS IS JUST TO CHECK THIS ON PHONES QUICKLY
const TEMP_ERROR_ALERT = true;
function errorToString(err: Error | string | MediaPermissionsError, constraints?: MediaStreamConstraints) {
if (typeof err == 'string') return err;

  let name = err.name;
  name = name === undefined ? "Error" : `${name}`;
  let msg = err.message;
  msg = msg === undefined ? "" : `${msg}`;

  if ('type' in err) name+='|'+err.type
  const cc = constraints === undefined ? undefined : "\n========================================\n" + JSON.stringify(constraints)
  return `[${name}]: ${msg}`  + '\n' + JSON.stringify(err, undefined, 2);
};

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

	const [permission, camera] = await requestMediaPermissions(combineConstraints(constraints, storedCamera))
		.then(async (success) => {
			// @ts-expect-error // TODO figure out when this happens
			if (!success) return ['denied-unknown'] as RequestResult

			// Just try this once to see if the stream starts, retry stored camera in case it changed
			return [
				'granted', 
				await getCamera(combineConstraints(constraints, getStoredCameraId(appName)), appName)
			] as RequestResult
		})
		.catch((err: MediaPermissionsError) => [handleMediaPermissionsError(err, appName, constraints)] as RequestResult)
		
	const devices = enumerateDevices ? await getDevices() : undefined
	return {
		permission,
		camera,
		devices
	}
}

function handleMediaPermissionsError(err: MediaPermissionsError, appName: string, constraints: MediaStreamConstraints) {
	const { type, message, name } = err
	const storedCamera = getStoredCameraId(appName);

	if (type === MediaPermissionsErrorType.SystemPermissionDenied) {
		// browser does not have permission to access camera or microphone
		return 'denied:system'
	} else if (type === MediaPermissionsErrorType.UserPermissionDenied) {
		// user didn't allow app to access camera or microphone
		return 'denied'
	} else if (type === MediaPermissionsErrorType.CouldNotStartVideoSource) {
		if (TEMP_ERROR_ALERT) alert('error:inuse+ ' + errorToString(err))
		// camera is in use by another application (Zoom, Skype) or browser tab (Google Meet, Messenger Video)
		// (mostly Windows specific problem)
		return 'error:inuse'
	} else if (name === 'AbortError' && message === "Starting videoinput failed") {
		if (TEMP_ERROR_ALERT) alert('error:inuse+ ' + errorToString(err))
		// Failed to start
		return 'error:inuse'
	} else if (name === 'NotReadableError') {
		if (TEMP_ERROR_ALERT) alert('error:inuse+ ' + errorToString(err))
		// Stream rejected reading data
		return 'error:inuse'
	} else if (type === MediaPermissionsErrorType.Generic && message === "Permission dismissed") {
		// prompt dismissed by user
		return 'unknown'
	} else if (name === "OverconstrainedError" && err.type?.toLowerCase() === "generic") {
		// This seems to happen when the camera has just stopped, either by stopping the streams or refreshing the page.
		// This may warrant a retry
		if (TEMP_ERROR_ALERT) alert('error:inuse:retry+ ' + errorToString(err,constraints))
		return 'error:inuse:retry'
	} else if (name === "OverconstrainedError" && ((err as OverconstrainedError).constraint === "deviceId" || message === "")
		&& storedCamera) {
		// This seems to happen when the browser stores a camera that doesn't exist (perhaps the ideas change on software update)
		// Erase storage and reload
		if (TEMP_ERROR_ALERT) alert('error:inuse+ ' + errorToString(err))
		storeCameraId(appName, undefined);
		return 'error:inuse'
	} else {
		if (TEMP_ERROR_ALERT) alert('error+ ' + errorToString(err))
		console.error(err)
		// not all error types are handled by this library
		return 'error'
	}
}


async function getCamera(constraints: MediaStreamConstraints, appName: string, id?: string): Promise<Camera> {

	const storedCamera = getStoredCameraId(appName)
	const requestedCamera = id ?? storedCamera ?? undefined
	const deviceConstraints = combineConstraints(constraints, requestedCamera);

	const mediaStream = await navigator.mediaDevices.getUserMedia(deviceConstraints)
		.catch(error => {
			if (error.name === 'NotReadableError') {
				// Sometimes the browser doesn't close the stream on mobile devices
				// To solve this we store and redirect.
				// TODO: see how this works in iframe
				debugger;
				if (TEMP_ERROR_ALERT) alert('NOTREADABLE+ ' + errorToString(error))
				storeCameraId(appName, requestedCamera)
				throw error
			}
			const result = handleMediaPermissionsError(error as MediaPermissionsError, appName, storedCamera)
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

