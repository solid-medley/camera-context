
import {
	MediaPermissionsError,
	MediaPermissionsErrorType,
	requestMediaPermissions
} from 'mic-check'
import { Camera, DeviceResult, FlatMediaDeviceInfo, MediaPermission, UserMediaState } from '../data-models/device'
import { getBrowserMetadata } from './browser-metadata'
import { errorToString, logModule } from './debug-helper';
import { features } from '../constants';

logModule('media-helper', import.meta)

function getLocalStorageName(appName: string, key: string) {
	return `${key}@${appName}`
}

export function getStoredCameraId(appName: string) {
	return localStorage.getItem(getLocalStorageName(appName, 'camera')) ?? undefined
}

export function storeCameraId(appName: string, id: string | 0 | undefined) {
	if (!id) return localStorage.removeItem(getLocalStorageName(appName, 'camera'))
	return localStorage.setItem(getLocalStorageName(appName, 'camera'), id)
}

export async function getMediaDeviceList(): Promise<DeviceResult> {
	if (!navigator.mediaDevices?.enumerateDevices) return 'not-available'

	try {
		const devices = await navigator.mediaDevices?.enumerateDevices() as InputDeviceInfo[]
		const flatDevices = await Promise.all(devices
			// AudioDevices shop up with empty label if no permission is given
			.filter(device => !!device.deviceId)
			.map(flatDeviceInput))
		return {
			videoInput: flatDevices.filter(device => device.kind === 'videoinput'),
			audioInput: flatDevices.filter(device => device.kind === 'audioinput'),
			audioOutput: flatDevices.filter(device => device.kind === 'audiooutput')
		}
	} catch (err) {
		// This may happen when the tab falls asleep and we try to list devices.
		// The "user interaction" is no longer valid then.
		if ((err as Error).message.includes('Illegal invocation')) return 'not-enumerated'
		throw err
	}
}

type RequestResult = [permission: MediaPermission, camera?: Camera | undefined, stream?: MediaStream | undefined];
export async function requestMediaPermission(constraints: MediaStreamConstraints, appName: string) : Promise<UserMediaState> {
	
	const [permission, camera, stream] = await requestMediaPermissions(constraints)
		.then(async (success) => {
			// @ts-expect-error // TODO figure out when this happens
			if (!success) return ['denied-unknown'] as RequestResult

			const [camera, stream] = await getCamera(constraints, appName)
			return [
				'granted', 
				camera, 
				stream
			] as RequestResult
		})
		.catch((err: MediaPermissionsError) => [handleMediaPermissionsError(err, appName)] as RequestResult)
		
	return {
		permission,
		camera,
		stream,
		usedConstraints: constraints
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

type CameraResult = [camera: Camera, stream?: MediaStream | undefined]
async function getCamera(constraints: MediaStreamConstraints, appName: string): Promise<CameraResult> {

	const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
		.catch(error => {
			if (error.name === 'NotReadableError') {
				if (features.DEBUG_ERROR_ALERT) alert('NOTREADABLE \n' + errorToString(error))
				// This no longer seems to happen inside of the iframe
				// TODO: Needs more testing
				debugger;
				throw error
			}
			const [result] = handleMediaPermissionsError(error as MediaPermissionsError, appName)
			if (result === 'error') throw error
			return undefined
		})

	if (!mediaStream) return [{
		uid: await createDeviceUid(undefined),
		deviceId: undefined,
		label: '?',
		facing: 'loading',
		name: '',
		streamId: undefined
	}]

	if (!mediaStream.active || !mediaStream.getTracks()) {
		return [{
			uid: await createDeviceUid(undefined),
			label: 'X',
			facing: 'loading',
			name: 'X',
			streamId: undefined
		}]
	}

	const uid = await createDeviceUid(mediaStream.getVideoTracks()[0]);
	const deviceId = mediaStream.getVideoTracks()[0].getSettings().deviceId!
	const groupId = mediaStream.getVideoTracks()[0].getSettings().groupId!

	storeCameraId(appName, uid)

	return [{
		uid: uid, 
		deviceId,
		groupId,
		name: mediaStream.getVideoTracks()[0].label,
		label: mediaStream.getVideoTracks()[0].label.split('(')[0].split(',')[0].trim(),
		videoTrackId: mediaStream.getVideoTracks()[0].id,
		facing: getBrowserMetadata().platform.type === 'desktop'
			? 'desktop' :
			mediaStream.getVideoTracks()[0].getSettings().facingMode as 'user' | 'environment',
		streamId: mediaStream.id
	}, mediaStream]
}

async function flatDeviceInput(inputDevice: InputDeviceInfo): Promise<FlatMediaDeviceInfo> {
	const capabilities = typeof inputDevice.getCapabilities === 'function' ? inputDevice.getCapabilities() : { }
	return {
		uid: await createDeviceUid(inputDevice),
		deviceId: inputDevice.deviceId,
		groupId: inputDevice.groupId,
		kind: inputDevice.kind,
		label: inputDevice.label,
		capabilities
	}
}

/** Apparently, the deviceId doesn't transfer between realms (frames). \
  * To work around this, we make it a non-whitespace hash with an insecure algorithm.
  * 
  * We could just use the label of course, but this looks more like an id.
  */
async function createDeviceUid(device: InputDeviceInfo | MediaStreamTrack | undefined) {
	if (device === undefined) return 0;
	
	const deviceLabel = device.label ?? 'any';

	const deviceKind = device instanceof MediaStream
		? device.kind
		: device.kind.replace('input', '').replace('output', '') 
		
	const deviceFacing = typeof device.getCapabilities !== 'function'
		? 'output'
		: device.getCapabilities().facingMode?.join(',') ?? 'any'
		
	const uniqueLabel = [deviceLabel.trim(), deviceKind.trim(), deviceFacing.trim()].join('+')

	// Make it look like an id with a built-in function
	return await shortHash(uniqueLabel)
		// Erase the equals with an arbitrary character, we don't decrypt anyway.
		// This is just a bit of fun to erase non-letter characters
		.then(h => h.replaceAll('=', 'ɴ'))
		.then(h => h.replaceAll('+', 'ʀ'))
		.then(h => h.replaceAll('-', 'ʀ'))
		.then(h => h.replaceAll('/', 'ʀ'))
		.then(h => h.replaceAll('\\', 'ʀ'))
}

async function shortHash(str: string) {
  const data = new TextEncoder().encode(str);
  const full = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(full).slice(0, 8); // 8 bytes
  return btoa(String.fromCharCode(...bytes));
}