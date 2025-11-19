import type { TransferrableUserMediaState } from "../data-models/device"
import { eventType, returnNothing, returnType, returnVoid } from "./sandbox.events"

const events = {
    initialized: { name: 'initialized',  type: eventType(), returns: returnNothing() },
    requestPermission: { name: 'requestPermission',  type: eventType(), returns: returnType<TransferrableUserMediaState>() },
    stop: { name: 'stop',  type: eventType(), returns: returnVoid() },
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