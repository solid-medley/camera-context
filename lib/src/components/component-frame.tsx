import { Accessor, createEffect, createSignal, getOwner, JSX, onCleanup } from 'solid-js';

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

    const { module, name, ref: _, sandbox: _s, ...frameProps } = props;

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

            // TODO perhaps use ?url again and make it completely separate
            const s = await import("solid-js");
            const web = await import("solid-js/web");
            const jsx = await import("solid-js/jsx-runtime");

            Object.assign(windowRef()!, {
                s, web, jsx,
                moduleProps: module.props, moduleUrl,
                signal: abortController.signal,
                parent: getOwner()
            })
            const frameApp = Object.assign(frameRef()!.contentDocument?.createElement('script')!, {
                type: 'module',
                textContent: `

                    const bodyEl = document.body;
                    if (!bodyEl) debugger;
                    
                    // TODO figure out render createroot warning
                    const dispose = s.createRoot(async disposeRoot => {
                        const owner = s.getOwner();
                        debugger;
                        const Component = (await import(moduleUrl)).default
                        const App = () => {
                            return jsx.createComponent(Component, moduleProps())
                        }
                        web.render(App, bodyEl, {
                            owner
                        })
                        console.log(location, 'loaded')

                        return disposeRoot;
                    }, parent);

                    

                    signal.addEventListener('abort', dispose, { once: true, passive: true, capture: true })
                `
            })
            bodyRef()!.append(frameApp);
            //     bodyRef()!.innerHTML = `
            //     <script type="module">
            //             console.log(window.s)
            //         function App() {
            //             console.log(2)
            //             const inc = () => setCount(v => v + 1)
            //             return html\`<button on:click=\${inc}>\${count}</button>\`
            //         }
            //         render(App, document.body);

            //         window.addEventListener("message", (event) => {
            //         // optional: check origin for security
            //         // if (event.origin !== "https://yourdomain.com") return;

            //         const { type } = event.data;
            //         if (type === "triggerClick") {
            //             cconsole.log('click')
            //         }
            //         });
            //     </script>
            //     <div>hi</div>
            // `
            // render(() => children(() => content)(), bodyRef()!);

        })

    }, [frameRef, bodyRef, windowRef])

    return (
        <iframe
            srcdoc="<html><head></head><body><div></div></body></html>"
            onLoad={() => {
                setBodyRef(frameRef()?.contentDocument?.body as HTMLBodyElement)
                setWindowRef(frameRef()?.contentWindow!)
            }}
            ref={setFrameRef}
            {...frameProps}
        />
    )
}