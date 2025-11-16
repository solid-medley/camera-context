import { EventName, EventTypes, matchEventCommand } from './camera-access.events';

export { event } from './camera-access.events';
export function verifyChildOrigin<TEventMessage extends MessageEvent>(uid: string, event: TEventMessage) {

    if (!event?.data) return;
    if (event.data.source === 'react-devtools-content-script') return false;
    if (!event.source) return false;

    // Instanceof doesn't work across realms
    if (Object.getPrototypeOf(event.source).constructor.name === Window.constructor.name) return false;
    if ((event.source as unknown as Record<string, string>).uid !== uid) return false;

    return true
}
export function verifyParentOrigin<TEventMessage extends MessageEvent>(parentOrigin: string, event: TEventMessage) {

    if (!event?.data) return;
    if (event.data.source === 'react-devtools-content-script') return false;
    if (!event.source) return false;

    // Instanceof doesn't work across realms
    if (Object.getPrototypeOf(event.source).constructor.name === Window.constructor.name) return false;
    if ((event.source as Window).origin !== parentOrigin) return false;

    return true
}

// TODO this could be an event map
export function forwardEvent<T extends EventName>(event: MessageEvent, name: T, cb: (event: EventTypes[T]) => void | Promise<void>) {
    if (!matchEventCommand(event, name)) return;
    Promise.resolve(cb(event)).catch(err => { throw err });
}