

const registeredEvents = [
    { name: 'initialized',  type: type() },
    { name: 'requestPermission',  type: type() },
] as const









// ------------------------------------------------------------------------

function type<TData extends unknown = never>() {
    return undefined as unknown as MessageEvent<TData>
}

export type EventName = (typeof registeredEvents[number])['name']
const eventMap = Object.fromEntries(registeredEvents.map(e => 
    [e.name as EventName, e as (typeof registeredEvents)[0]]
)) 

export const event = (name: EventName): { command: EventName } => ({ command: eventMap[name].name })
export type EventTypes = {
    [Key in keyof typeof eventMap]: (typeof eventMap)[Key]['type']
}

export const matchEventCommand = (event: MessageEvent, command: keyof EventTypes): event is EventTypes[typeof command] => {
    return event.data.command === command;
}