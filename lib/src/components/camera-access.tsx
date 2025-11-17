import { Accessor, Component, createSignal, createUniqueId, onCleanup, onMount, Setter } from "solid-js";
import { Sandbox } from "./sandbox";
import { Portal } from "solid-js/web";
import type { UserMediaState } from "../data-models/device";
import type { CameraAccessWrapperProps } from './camera-access.wrapper';

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
    const [stream, setStream] = createSignal<MediaStream>();

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
        if (!result.camera?.streamId) return setState(result as UserMediaState)
        
        if (result.camera.streamId !== stream()?.id) throw new Error('illegal state, incorrect stream id');
        return setState({ ...result, camera: { ...result.camera, stream: stream() } })
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
        <Sandbox<CameraAccessWrapperProps>
            ref={(el) => setTargetWindow(el!.contentWindow!)}
            allow={formatPermissions(constraints)}
            sandbox="allow-same-origin allow-scripts allow-forms"
            module={wrapperModule.url}
            moduleProps={{ constraints, appName, postStream: setStream }}
            uid={uid}
        />
    </Portal>
}