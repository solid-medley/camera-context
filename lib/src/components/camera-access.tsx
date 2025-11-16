import { Accessor, Component, createSignal, createUniqueId, onCleanup, onMount, Setter } from "solid-js";
import { Sandbox } from "./sandbox";
import { Portal } from "solid-js/web";
import type { UserMediaState } from "../data-models/device";

const { forwardEvent, verifyChildOrigin, event } = await import('./sandbox.helpers')
const wrapperModule = await import('./camera-access.wrapper');


function formatPermissions(constraints: MediaStreamConstraints): string | undefined {
    const allowAudio = constraints ? !!constraints.audio : true
    if (!allowAudio) return "camera 'src'"
    return "camera 'src'; microphone 'src'"
}

export type CameraAccessState = {
    state: Accessor<UserMediaState>
    requestPermission(): Promise<UserMediaState>
}
export type CameraAccessConfig = {
    constraints: MediaStreamConstraints
    appName: string
}
export type CameraAccessProps = CameraAccessConfig & {
    ref: Setter<CameraAccessState | undefined>
}

export const CameraAccess: Component<CameraAccessProps> = ({ constraints, appName, ref: setRef }) => {

    const abortController = new AbortController();
    onCleanup(() => abortController.abort('unmount'));

    const [state, setState] = createSignal<UserMediaState>();

    const [targetWindow, setTargetWindow] = createSignal<WindowProxy>()
    const uid = createUniqueId()

    function initialized() {
        setState({
            permission: 'unknown',
            camera: undefined,
            devices: undefined
        });
        setRef({
            state: state as Accessor<UserMediaState>,
            requestPermission
        });
    }

    async function requestPermission() {
        setState(s => ({ ...s, permission: 'pending' }));
        const result = await new Promise<UserMediaState>(res => {
            window.addEventListener("message", async (event) => {
                if (!verifyChildOrigin(uid, event)) return;
                if (event.data.cb === 'requestPermission') res(event.data.userMediaresult);
            }, { once: true, capture: true })

            targetWindow()!.postMessage(event('requestPermission'), targetWindow()!.origin)
        })
        
        return setState(result)
    }

    onMount(() => {
        window.addEventListener("message", async (event) => {
            // This is necessary so dev tools don't hog the event
            if (!verifyChildOrigin(uid, event)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                event.stopPropagation();

                return false
            };

            const initializing = !state();

            // Do nothing until initialized
            if (initializing) forwardEvent(event, 'initialized', initialized);
            if (initializing) return;

        }, { signal: abortController.signal })
    })

    return <Portal ref={(element) => {
        element.id = 'camera-access';
        element.style.display = 'none';
    }} useShadow>
        <Sandbox<CameraAccessConfig>
            ref={(el) => setTargetWindow(el!.contentWindow!)}
            allow={formatPermissions(constraints)}
            sandbox="allow-same-origin allow-scripts allow-forms"
            module={wrapperModule.url}
            initialState={{ constraints, appName }}
            uid={uid}
        />
    </Portal>
}