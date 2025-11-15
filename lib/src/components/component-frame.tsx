import { createEffect, createSignal, JSX, onCleanup } from 'solid-js';

type ModuleLoaderProps<T extends Promise<{ default: (props: TProps) => JSX.Element }>, TProps extends any> = {
  module: () => T;
  moduleProps: TProps
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

    const { module, moduleProps, name, ref: _, sandbox: _s, ...frameProps } = props;
    
    const moduleUrl = module.toString().replace('() => import("', '').replace('")', '');

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
            const s = await import("solid-js");
            const web = await import("solid-js/web");
            const jsx = await import("solid-js/jsx-runtime");

            Object.assign(windowRef()!, {
                s, web, jsx,
                // componentUrl: (await componentUrl).default ,
                module, moduleProps, moduleUrl
            })

            // const dispose = createRoot(disposeRoot => {

                const frameApp = Object.assign(frameRef()!.contentDocument?.createElement('script')!, {
                    type: 'module',
                    textContent: `
                        const Component = (await import(moduleUrl)).default
                        const props = moduleProps

                        web.render(() => jsx.createComponent(Component, props), document.body)
                        console.log(location, 'loaded')
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
                // return disposeRoot;
            // }, undefined);

            // abortController.signal.addEventListener('abort', dispose, { once: true, passive: true, capture: true })
        })

    }, [frameRef, bodyRef, windowRef])

    return (
        <iframe
            srcdoc="<html><head></head><body></body></html>"
            onLoad={() => {
                setBodyRef(frameRef()?.contentDocument?.body as HTMLBodyElement)
                setWindowRef(frameRef()?.contentWindow!)
            }}
            ref={setFrameRef}
            {...frameProps}
        />
    )
}