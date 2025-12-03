import type { InternalMediaConstraints } from "../data-models/constraints"
import { MediaDevices, type UserMediaState } from "../data-models/device"
import { eventType, returnNothing, returnType, returnVoid } from "./sandbox.events"

const events = {
    /** 
     * Event to indicate the media context sandbox has been initialized 
     * 
     * `DIR: sandbox->marshal`
     */
    initialized: { name: 'initialized',  type: eventType(), returns: returnNothing() },
    /** 
     * Event to indicate the user-media state has changed. \
     * This event handler has been put into the sandbox because firefox doesn't allow enumerating devices in another realm
     * than the one that has been granted access.
     * 
     * `DIR: sandbox->marshal`
     */
    updateMediaDevices: { name: 'updateMediaDevices',  type: eventType<MediaDevices>(), returns: returnNothing() },
    
    /** 
     * Event to request media permission.
     * 
     * `DIR: marshal->sandbox->marshal`
     */
    requestPermission: { name: 'requestPermission',  type: eventType<InternalMediaConstraints>(), returns: returnType<UserMediaState>() },
    /** 
     * Event to stop the media stream.
     * 
     * `DIR: marshal->sandbox->marshal`
     */
    stopStream: { name: 'stopStream',  type: eventType(), returns: returnVoid() },
} as const

// ------------------------------------------------------------------------

export type EventName = keyof typeof events

export type EventTypes = {
    [Key in keyof typeof events]: (typeof events)[Key]['type']
}
export type EventReturnTypes = {
    [Key in keyof typeof events]: (typeof events)[Key]['returns']
}

export const getCommandName = (command: keyof EventTypes): string => {
    return events[command].name
}

export const hasReturnType = (command: keyof EventTypes) => {
    return events[command].returns !== undefined
}