import { EventName, EventReturnTypes, EventTypes, getCommandName, hasReturnType } from './camera-access.events';

export function verifyOrigin(event: MessageEvent) {

    if (!event?.data) return;
    if (event.data.source === 'react-devtools-content-script') return false;
    if (!event.source) return false;

    return true
}
export function verifyChildOrigin<TEventMessage extends MessageEvent>(uid: string, event: TEventMessage) {

    if (!verifyOrigin(event)) return;

    // Instanceof doesn't work across realms
    if (Object.getPrototypeOf(event.source).constructor.name === Window.constructor.name) return false;
    if ((event.source as unknown as Record<string, string>).uid !== uid) return false;

    return true
}
export function verifyParentOrigin<TEventMessage extends MessageEvent>(parentOrigin: string, event: TEventMessage) {

    if (!verifyOrigin(event)) return;

    // Instanceof doesn't work across realms
    if (Object.getPrototypeOf(event.source).constructor.name === Window.constructor.name) return false;
    if ((event.source as Window).origin !== parentOrigin) return false;

    return true
}

const callback = <T extends EventName>(name: T, data: EventReturnTypes[T]) => {
    return { cb: name, data }
}

export async function forwardEvent<T extends EventName>(event: MessageEvent, name: T, handler: (event: EventTypes[T]) => void | Promise<void>): Promise<void> {
    if (getCommandName(name) !== event.data.command as string) return;
    await Promise.resolve(handler(event as EventTypes[T])).catch(err => { throw err });
}

const awaitCallBack = <T extends keyof EventTypes>(command: T) => new Promise<EventReturnTypes[T]>(res => {
    window.addEventListener("message", async (event) => {
        if (!verifyOrigin(event)) return;
        if (event.data.cb === getCommandName(command)) res(event.data.data);
    }, { once: true, capture: true })
})

export async function send<T extends keyof EventTypes>(
    targetWindow: Window, command: T, data: EventTypes[T], transfer?: Transferable[]
): Promise<EventReturnTypes[T]> {
    const returnType = hasReturnType(command);
    const callBack = returnType ? awaitCallBack(command) : Promise.resolve(undefined as Awaited<EventReturnTypes[T]>);

    targetWindow.postMessage({ command, data }, targetWindow.origin, transfer)

    return await callBack;

}
export async function sendCallback<T extends keyof EventTypes>(
    targetWindow: Window, command: T, data: EventReturnTypes[T], transfer?: Transferable[]
): Promise<void> {

    targetWindow.postMessage(callback(command, data), targetWindow.origin, transfer)

}

export function registerParentHandlers(uid: string, abortSignal: AbortSignal, handler: (event: MessageEvent) => Promise<void> ) {
    window.addEventListener("message", async (event) => {
            // This is necessary so dev tools don't hog the event
        if (!verifyChildOrigin(uid, event)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            event.stopPropagation();

            return false
        };

        await handler(event);

    }, { signal: abortSignal })
}
export function registerChildHandlers(parent: Window, abortSignal: AbortSignal, handler: (event: MessageEvent) => Promise<void> ) {
    
    window.addEventListener("message", async (event) => {
            // This is necessary so dev tools don't hog the event
        if (!verifyParentOrigin(parent.origin, event)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            event.stopPropagation();

            return false
        };

        await handler(event);

    }, { signal: abortSignal })
}