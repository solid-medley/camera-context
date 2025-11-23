import { MediaContextConfiguration } from "./camera-context"
import type { MediaPermission } from "./data-models/device"

export const features = {
    /** MAXIMUM AMOUNT OF RETRIES, set to 0 to disable */
    RETRY_MAX: 3,
    /** Log the module names where {@link typeof import("./helpers/debug-helper").logModules} is used */
    DEBUG_LOG_MODULE_ENABLED: true,
    /** Enable alerts from within the iframe, useful for debugging a mobile device on a production build */
    DEBUG_ERROR_ALERT: false
} as const

export const retryAblePermissions: MediaPermission[] = [
    'error:inuse'
] as const
export const faultyMediaPermissions: MediaPermission[] = [
    'denied', 
    'denied:system',
    // 'error:inuse' is not a "faulty" state, a user can try again later
    'error:no-support',
    'error:unexpected',
] as const
export const idleMediaPermissions: MediaPermission = 'unknown' as const

export const defaultConfiguration: MediaContextConfiguration = {
    noSignalText: 'no-signal',
    noDevicesText: "No devices available"
}