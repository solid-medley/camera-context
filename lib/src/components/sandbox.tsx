import type { JSX } from 'solid-js';

type IFrameProps =
    & Omit<JSX.IframeHTMLAttributes<HTMLIFrameElement>, keyof JSX.HTMLAttributes<HTMLIFrameElement>>

export type SandboxProps<TProps extends Record<string, unknown>> =
    & Omit<IFrameProps, 'srcdoc' | 'src' | 'onload' | 'onLoad'>
    & {
        /** The initial configuration for the sandboxed module */
        props: TProps
        /** Universal identifier, useful for source matching */
        uid: string,

        abortSignal: AbortSignal
    }

export type SandBox = {
    window: WindowProxy,
    close(): Promise<void>
}
export async function createSandbox<TModuleProps extends Record<string, unknown>>(
    moduleUrl:string, sandboxProps: SandboxProps<TModuleProps>
) {

    const { uid, props: moduleProps, abortSignal: parentAbortSignal, ...frameProps } = sandboxProps;

    const id = moduleUrl.split('/').at(-1)?.replace('.jsx', '').split('?')[0];
    const abortController = new AbortController();
    parentAbortSignal.addEventListener('abort', abortController.abort, { once: true, capture: true });

    return new Promise<SandBox>((resolve, reject) => {

        let iframe: HTMLIFrameElement = Object.assign(document.createElement('iframe'), frameProps, {
            id,
            srcdoc: "<html><body></body></html>"
        });

        // This doesn't work with Object.assign
        iframe.style.display = 'none';

        iframe.addEventListener('load', () => {
            const contentWindow = iframe.contentWindow!;
            const contentDocument = iframe.contentDocument!;
           
            Object.assign(contentWindow, {
                props: {
                    signal: abortController.signal,
                    ...moduleProps,
                    parent: window,
                    uid
                },
                uid,
                callback(err: Error | undefined) {
                    if (err) {
                        iframe?.remove();
                        return reject(err);
                    }
                    
                    resolve({
                        window: contentWindow,
                        close: () => new Promise<void>(res => {
                            abortController.abort('retry');
                            iframe.addEventListener('load', () => {
                                iframe?.remove();
                                iframe = undefined! as HTMLIFrameElement;
                                res()
                            }, { once: true, signal: parentAbortSignal })
                            iframe.contentWindow!.location.reload()
                        })
                    })
                }
            })

            // const sandboxedModule = Object.assign(frameRef()!.contentDocument?.createElement('script')!, {
            //     type: 'module',
            //     src: moduleUrl
            // })
            // bodyRef()!.append(sandboxedModule);
            
            const sandboxInit = Object.assign(contentDocument.createElement('script')!, {
                type: 'module',
                async: true,
                defer: true,
                textContent: [
                    `import sbModule from '${moduleUrl}';`,
                    `await sbModule(props)`,
                    `.then(callback)`,
                    `.catch(callback);`
                ].join(import.meta.env.DEV ? '\n' : '')
            })
            contentDocument.body.append(sandboxInit);
        }, { once: true, signal: abortController.signal })

        window.document.body.append(iframe)
    })
}