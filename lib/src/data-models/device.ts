
export type UserMediaState = {
	permission: MediaPermission
    camera: Camera | undefined
    devices: DeviceResult
}

/**
 * The MediaStream, the MediaStreamTrack, nor the VideoFrame objects are transferrable or DataCloneable
 * Because of that we pump it into a MessageChannel instead.
 * 
 * We revert this before exposing it to any library consumers.
 */
export type TransferrableUserMediaState = Omit<UserMediaState, 'camera'> & {
    camera: TransferrableCamera | undefined
    devices: DeviceResult
}

export type Camera = {
	id: string
	label: string
	name: string
	facing: 'user' | 'environment' | 'desktop' | 'loading' | undefined,
	stream: MediaStream | undefined
}
export type TransferrableCamera = Omit<Camera, 'stream'> & {
	streamId: string | undefined
}
export type FlatMediaDeviceInfo = 
	& Omit<MediaDeviceInfo, 'toJSON'>
	& { capabilities: MediaTrackCapabilities }
export type DeviceResult = 
	// not enumerated
	| undefined
	// No enumerate devices
	| { videoDevices: undefined }
	// Proper result
	| { videoDevices: FlatMediaDeviceInfo[] }

export type MediaPermission =
	'granted' | 'denied' | 'denied:system' | 'error:unexpected' | 'error:inuse' | 'error:no-support' |
	'pending' | 'unknown'