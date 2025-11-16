import { Accessor, Component, createSignal, createUniqueId, onCleanup, onMount, Setter } from "solid-js";
import { Sandbox } from "./sandbox";
import { Portal } from "solid-js/web";
import type { UserMediaState } from "../data-models/device";

const { registerParentHandlers, forwardEvent, send } = await import('./sandbox.helpers')
const wrapperModule = await import('./camera-access.wrapper');

// TODO figure out what's wrong with the types
declare const MediaStreamTrackGenerator: any


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
        setState(s => ({ ...s!, permission: 'pending' }));
        const result = await send(targetWindow()!, 'requestPermission', undefined as never)
        if (!result.camera?.stream) return setState(result as UserMediaState)

        const generator = new MediaStreamTrackGenerator({ kind: "video" });
        const writable = generator.writable.getWriter();

        result.camera!.stream!.onmessage = async ({ data: frame }) => {
            if ((frame as VideoFrame).codedWidth === 0) return frame.close();
            try{
                await writable.write(frame);
                frame.close()
            } catch( err) {
                debugger;
            }
        };
        result.camera.stream.start()

        const stream = new MediaStream([generator]);
        return setState({ ...result, camera: { ...result.camera, stream } })

    }

    onMount(() => registerParentHandlers(uid, abortController.signal, async (event) => {

        const initializing = !state();

        // Do nothing until initialized
        if (initializing) await forwardEvent(event, 'initialized', initialized);
        if (initializing) return;

    }))

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