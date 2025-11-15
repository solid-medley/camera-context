import { Accessor, createEffect, createSignal, getOwner, JSX, onCleanup } from 'solid-js';
import * as s from 'solid-js'
import * as jsx from 'solid-js/jsx-runtime'

const importPattern = /import\(["'`]+(?<url>\S+)["'`]+\)/ius

type ModuleLoaderProps<T extends Promise<{ default: (props: TProps) => JSX.Element }>, TProps extends any> = {
    module: { component: () => T, props: Accessor<TProps>  };
}

type IFrameProps =
    & Omit<JSX.IframeHTMLAttributes<HTMLIFrameElement>, keyof JSX.HTMLAttributes<HTMLIFrameElement>>
    & Pick<JSX.HTMLAttributes<HTMLIFrameElement>, 'style'>
    & Pick<JSX.CustomAttributes<HTMLIFrameElement>, 'ref'>

export type ComponentFrameProps<T extends Promise<{ default: (props: TProps) => JSX.Element }>, TProps extends any> =
    & Omit<IFrameProps, 'srcdoc' | 'src' | 'onload' | 'onLoad'>
    & ModuleLoaderProps<T, TProps>
    & {
        name?: string
        id?: string
    }

export const ComponentFrame = <T extends Promise<{ default: (props: TProps) => JSX.Element }>, TProps extends any,>(props: ComponentFrameProps<T, TProps>) => {

    const { module, name, ref: _, ...frameProps } = props;

    let moduleUrl = module.component.toString().match(importPattern)?.groups?.['url']
    // TODO proper error
    if (!moduleUrl) {
        debugger;
        return undefined;
    }
    moduleUrl = import.meta.resolve(moduleUrl!);

    const abortController = new AbortController();
    onCleanup(() => abortController.abort('unmount'));

    const [frameRef, setFrameRef] = createSignal<HTMLIFrameElement>();
    const [bodyRef, setBodyRef] = createSignal<HTMLBodyElement>();
    const [windowRef, setWindowRef] = createSignal<Window>();

    createEffect(() => {
        if (!bodyRef() || !windowRef()) return;
        if (typeof props.ref === 'function') props.ref?.(frameRef()!)
        if (!!props.ref) props.ref = frameRef();

        queueMicrotask(async () => {


            const { render } = await import('solid-js/web');
            Object.assign(windowRef()!, {
                s, render, jsx,
                moduleProps: module.props, moduleUrl,
                signal: abortController.signal,
                parent: getOwner()
            })
            const frameApp = Object.assign(frameRef()!.contentDocument?.createElement('script')!, {
                type: 'module',
                textContent: `
                // TODO this still has createRoot issues, maybe wrap in a component that creates a root
                try{
                    const bodyEl = document.body;
                    if (!bodyEl) debugger;
                    
                    const Component = (await import(moduleUrl)).default
                    const App = () => {
                        return jsx.createComponent(Component, moduleProps())
                    }
                    render(App, bodyEl, {
                        owner: parent
                    })
            } catch(err) {
                        debugger;
                        console.log(err);
                        throw err;
            }
                `
            })
            bodyRef()!.append(frameApp);
        })

    }, [frameRef, bodyRef, windowRef])

    return (
        <iframe
            srcdoc="<html><head></head><body><div></div></body></html>"
            onLoad={() => {
                if (!frameRef()?.contentDocument?.body) return;
                setBodyRef(frameRef()?.contentDocument?.body as HTMLBodyElement)
                setWindowRef(frameRef()?.contentWindow!)
            }}
            ref={setFrameRef}
            {...frameProps}
        />
    )
}