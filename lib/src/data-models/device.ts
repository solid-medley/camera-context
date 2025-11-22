import { MediaConstraints } from "./constraints"

export type UserMediaState = {
	permission: MediaPermission
    camera: Camera | undefined
	stream: MediaStream | undefined
	usedConstraints: MediaStreamConstraints | MediaConstraints
}

export type Camera = {
	readonly uid: string | 0
	readonly deviceId?: string
	readonly groupId?: string
	readonly videoTrackId?: string
	readonly label: string
	readonly name: string
	readonly facing: 'user' | 'environment' | 'desktop' | 'loading' | undefined,
	readonly streamId: string | undefined
}

export type FlatMediaDeviceInfo = 
	& Omit<MediaDeviceInfo, 'toJSON'>
	& { 
		readonly uid: string | 0,
		readonly capabilities: MediaTrackCapabilities
	}
export type DeviceResult = 
	// not enumerated
	| 'not-enumerated'
	// No enumerate devices
	| 'not-available'
	// Proper result
	| { 
		readonly videoInput: FlatMediaDeviceInfo[], 
		readonly audioInput: FlatMediaDeviceInfo[], 
		readonly audioOutput: FlatMediaDeviceInfo[] 
	}

export type MediaPermission =
	'granted' | 'denied' | 'denied:system' | 'error:unexpected' | 'error:inuse' | 'error:no-support' |
	'pending' | 'unknown'

	
export function hasPermission(state: undefined | UserMediaState, ...permissionsToCheck: MediaPermission[]) {
  if (!state) return false;
  
  return matchesPermission(state.permission, ...permissionsToCheck)
}
export function matchesPermission(permission: undefined | MediaPermission, ...permissionsToCheck: MediaPermission[]) {
  if (!permission) return false;
  
  if (!permission) return false
  return permissionsToCheck.includes(permission);
}