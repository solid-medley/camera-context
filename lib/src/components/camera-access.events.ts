import type { TransferrableUserMediaState } from "../data-models/device"


const events = {
    initialized: { name: 'initialized',  type: eventType(), returns: returnVoid() },
    requestPermission: { name: 'requestPermission',  type: eventType(), returns: returnType<TransferrableUserMediaState>() },
} as const









// ------------------------------------------------------------------------

function eventType<TData extends unknown = never>() {
    return undefined as unknown as TData
}
function returnType<TData extends object>() {
    return true as unknown as TData
}
function returnVoid() {
    return undefined as void
}

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