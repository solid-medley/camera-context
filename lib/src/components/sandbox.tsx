import { createEffect, createMemo, createSignal, JSX, onCleanup } from 'solid-js';

type IFrameProps =
    & Omit<JSX.IframeHTMLAttributes<HTMLIFrameElement>, keyof JSX.HTMLAttributes<HTMLIFrameElement>>
    & Pick<JSX.HTMLAttributes<HTMLIFrameElement>, 'style'>
    & Pick<JSX.CustomAttributes<HTMLIFrameElement>, 'ref'>

export type SandboxProps<TInitialState extends unknown> =
    & Omit<IFrameProps, 'srcdoc' | 'src' | 'onload' | 'onLoad'>
    & {
        /** The module to load inside of the frame  */
        module: string,
        /** The initial configuration for the sandboxed module */
        initialState: TInitialState
        /** Universal identifier, useful for source matching */
        uid: string
    }

type BaseSandboxedProps = {
    abortSignal: AbortSignal
    postMessage: Window['postMessage']
    parent: Window,
    uid: string
};
export type SandboxedProps<TInitialState extends unknown> = TInitialState extends never
    ? BaseSandboxedProps
    : BaseSandboxedProps & {initialState:TInitialState}

export type SandboxedModule<TInitialState extends unknown> = (props: SandboxedProps<TInitialState>) => Promise<void> | void

export const Sandbox = <TInitialState extends unknown = never,>(props: SandboxProps<TInitialState>) => {

    const { module, initialState, uid, ref: _, ...frameProps } = props;
    

    const abortController = new AbortController();
    onCleanup(() => abortController.abort('unmount'));

    const [frameRef, setFrameRef] = createSignal<HTMLIFrameElement>();
    const [bodyRef, setBodyRef] = createSignal<HTMLBodyElement>();
    const [windowRef, setWindowRef] = createSignal<Window>();
    const [runOnceId, setRunOnce] = createSignal<string>();
    const runOnce = createMemo(() => !!runOnceId() && !!frameRef() && !!bodyRef(), [runOnceId])

    createEffect(() => {
        if (runOnce()) return;
        if (!bodyRef() || !windowRef()) return;
        if (typeof props.ref === 'function') props.ref?.(frameRef()!)
        if (!!props.ref) props.ref = frameRef();

        queueMicrotask(async () => {

            const moduleUrl = import.meta.resolve(module!);
            setRunOnce(moduleUrl);
            const sandboxedModule = Object.assign(frameRef()!.contentDocument?.createElement('script')!, {
                type: 'module',
                src: moduleUrl
            })
            bodyRef()!.append(sandboxedModule);
            Object.assign(windowRef()!, {
                props: {
                    signal: abortController.signal,
                    initialState,
                    parent: window,
                    uid
                },
                uid
            })
            const sandboxInit = Object.assign(frameRef()!.contentDocument?.createElement('script')!, {
                type: 'module',
                async: true,
                defer: true,
                textContent: [
                    `import sbModule from '${moduleUrl}'`,
                    `await sbModule(props)`
                ].join(import.meta.env.DEV ? '\n' : '; ')
            })
            bodyRef()!.append(sandboxInit);
        })

    }, [runOnce])

    return (
        <iframe
            srcdoc="<html><body></body></html>"
            onLoad={() => {
                if (!frameRef()?.contentDocument?.body) return;
                setBodyRef(frameRef()?.contentDocument?.body as HTMLBodyElement)
                setWindowRef(frameRef()?.contentWindow!)
            }}
            ref={setFrameRef}
            style={{
                display: 'none'
            }}
            {...frameProps}
        />
    )
}