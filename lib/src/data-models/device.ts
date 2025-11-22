
export type UserMediaState = {
	permission: MediaPermission
    camera: Camera | undefined
	stream: StoppableStream | undefined
}
export type StoppableStream = MediaStream & { stopped: boolean }

export type Camera = {
	uid: string | 0
	deviceId?: string
	groupId?: string
	videoTrackId?: string
	label: string
	name: string
	facing: 'user' | 'environment' | 'desktop' | 'loading' | undefined,
	streamId: string | undefined
}

export type FlatMediaDeviceInfo = 
	& Omit<MediaDeviceInfo, 'toJSON'>
	& { 
		uid: string | 0,
		capabilities: MediaTrackCapabilities
	}
export type DeviceResult = 
	// not enumerated
	| 'not-enumerated'
	// No enumerate devices
	| 'not-available'
	// Proper result
	| { 
		videoInput: FlatMediaDeviceInfo[], 
		audioInput: FlatMediaDeviceInfo[], 
		audioOutput: FlatMediaDeviceInfo[] 
	}

export type MediaPermission =
	'granted' | 'denied' | 'denied:system' | 'error:unexpected' | 'error:inuse' | 'error:no-support' |
	'pending' | 'unknown'