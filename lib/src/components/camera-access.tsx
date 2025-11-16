import { Accessor, Component, createSignal, createUniqueId, onCleanup, onMount, Setter } from "solid-js";
import { Sandbox } from "./sandbox";
import { Portal } from "solid-js/web";

const { forwardEvent, verifyChildOrigin, event } = await import('./sandbox.helpers')
const wrapperModule = await import('./camera-access.wrapper');


function formatPermissions(constraints: MediaStreamConstraints): string | undefined {
    const allowAudio = constraints ? !!constraints.audio : true
    if (!allowAudio) return "camera 'src'"
    return "camera 'src'; microphone 'src'"
}

export type CameraPermission = 'unknown' | 'pending'
export type CameraAccessState = {

    permission: Accessor<CameraPermission>
    requestPermission(): Promise<CameraPermission>
}
export type CameraAccessProps = {
    constraints: MediaStreamConstraints
    ref: Setter<CameraAccessState | undefined>
}

export const CameraAccess: Component<CameraAccessProps> = ({ constraints, ref: setRef }) => {

    const abortController = new AbortController();
    onCleanup(() => abortController.abort('unmount'));

    const [state, setState] = createSignal<CameraAccessState>();
    const [permission, setPermission] = createSignal<CameraPermission>('unknown');

    const [targetWindow, setTargetWindow] = createSignal<WindowProxy>()
    const uid = createUniqueId()

    function initialized() {
        setPermission('unknown');
        setState({
            permission,
            requestPermission
        })
        setRef(state());
    }

    async function requestPermission() {
        setPermission('pending')
        await new Promise<void>(res => {
            window.addEventListener("message", async (event) => {
                if (!verifyChildOrigin(uid, event)) return;
                if (event.data.cb === 'requestPermission') res();
            }, { once: true, capture: true })

            targetWindow()!.postMessage(event('requestPermission'), targetWindow()!.origin)
        })
        
        // TODO result from postmessage
        return setPermission('unknown')
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
        <Sandbox<MediaStreamConstraints>
            ref={(el) => setTargetWindow(el!.contentWindow!)}
            allow={formatPermissions(constraints)}
            sandbox="allow-same-origin allow-scripts allow-forms"
            module={wrapperModule.url}
            initialState={constraints}
            uid={uid}
        />
    </Portal>
}