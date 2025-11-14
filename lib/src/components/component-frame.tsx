import { children, createEffect, createRoot, createSignal, getOwner, JSX, onCleanup, ParentComponent } from "solid-js";
import { render } from "solid-js/web";

type IFrameProps = Omit<JSX.IframeHTMLAttributes<HTMLIFrameElement>, keyof JSX.HTMLAttributes<HTMLIFrameElement>>
export type ComponentFrameProps = Omit<IFrameProps, 'srcdoc' | 'src' | 'onload' | 'onLoad' | 'ref'> & {
    name?: string
}
export const ComponentFrame: ParentComponent<ComponentFrameProps> = (props) => {

    const { children: content, name, ...frameProps } = props;
    const renderOwner = getOwner();

    const abortController = new AbortController();
    onCleanup(() => abortController.abort('unmount'));


    const [frameRef, setFrameRef] = createSignal<HTMLIFrameElement>();
    const [bodyRef, setBodyRef] = createSignal<HTMLBodyElement>();


    createEffect(() => {
        if (!bodyRef()) return;


        const dispose = createRoot(disposeRoot => {
            bodyRef()!.innerHTML = '';
            render(() => children(() => content)(), bodyRef()!);
            return disposeRoot;
        }, renderOwner);

        abortController.signal.addEventListener('abort', dispose, { once: true, passive: true, capture: true })

    }, [frameRef, bodyRef])

    return (
        <iframe
            srcdoc={name ?? '#'}
            onLoad={() => setBodyRef(frameRef()?.contentDocument?.body as HTMLBodyElement)}
            ref={setFrameRef}
            {...frameProps}
        />
    )
}