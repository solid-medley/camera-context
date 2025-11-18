
type BaseSandboxedProps = {
    abortSignal: AbortSignal
    postMessage: Window['postMessage']
    parent: Window,
    uid: string
};
export type SandboxedProps<TProps extends Record<string, unknown>> = TProps extends never
    ? BaseSandboxedProps
    : BaseSandboxedProps & { [Key in keyof TProps]:TProps[Key] }

export type SandboxedModule<TProps extends Record<string, unknown>> = (props: SandboxedProps<TProps>) => Promise<void> | void

export const sandboxModule = <TModuleProps extends Record<string, unknown>>(
    importMeta: ImportMeta,
    sandboxedModule: SandboxedModule<TModuleProps>
) => Object.assign(sandboxedModule, { url: importMeta.url })