
export type UserMediaState = {
	permission: MediaPermission
    camera: Camera | undefined
    devices: DeviceResult
}

export type Camera = {
	id: string
	label: string
	name: string
	facing: 'user' | 'environment' | 'desktop' | 'loading' | undefined,
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
	'granted' | 'denied' | 'denied:system' | 'error' | 'error:inuse' | 'error:nosupport' |
	'pending' | 'unknown'