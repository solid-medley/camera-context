import { Accessor, Component, createSignal, createUniqueId, onCleanup, onMount, Setter, } from "solid-js";
import { createSandbox, SandBox } from "./sandbox";
import type { UserMediaState } from "../data-models/device";
import type { CameraAccessWrapperProps } from './camera-access.wrapper';
import { forMilliseconds } from "../helpers/timeout";
import { hasPermission, matchesPermission } from "../camera-context";
import { stopStream } from "../helpers/stream-helper";
import { createAbortSignal } from "../helpers/create-abort";
import { features, retryAblePermissions } from "../constants";
import { logModule } from "../helpers/debug-helper";

// These imports are await imports on purpose for the bundler
const { send } = await import('./sandbox.helpers')
const wrapperModule = (await import('./camera-access.wrapper')).default;

logModule('camera-access', import.meta)

const RETRY_ENABLED = features.RETRY_MAX > 0;

function formatPermissions(constraints: MediaStreamConstraints): string | undefined {
    const allowAudio = constraints ? !!constraints.audio : true
    if (!allowAudio) return "camera 'src'"
    return "camera 'src'; microphone 'src'"
}

export type CameraAccessState = {
    state: Accessor<UserMediaState>
    requestPermission(): Promise<UserMediaState>
    stop(): Promise<void>
}
export type CameraAccessConfig = {
    constraints: MediaStreamConstraints
    appName: string
}
export type CameraAccessProps = CameraAccessConfig & {
    ref: Setter<CameraAccessState | undefined>
}

export const CameraAccess: Component<CameraAccessProps> = ({ constraints, appName, ref: setRef }) => {

    const [abortSignal, abortController] = createAbortSignal();

    const [state, setState] = createSignal<UserMediaState>();
    const [stream, setStream] = createSignal<MediaStream>();

    const [sandbox, setSandbox] = createSignal<SandBox>()
    const uid = createUniqueId()

    const createNameLater = () => createSandbox<CameraAccessWrapperProps>(wrapperModule.url, {
        uid,
        abortSignal,
        allow: formatPermissions(constraints),
        sandbox: "allow-same-origin allow-scripts" + (features.DEBUG_ERROR_ALERT ? " allow-forms allow-modals" : ""),
        props: {
            appName,
            constraints,
            postStream: setStream,
        }
    });

    let requestAttempt = 0;
    async function requestPermission(initial = true) {
        if (initial) requestAttempt = 0;
        // ANTI-LOOP
        if (hasPermission(state, 'denied', 'denied:system', 'error:no-support', 'granted')) return state()!;
        if (requestAttempt > features.RETRY_MAX) return state()!;

        // if (initial) alert('initial \n' + new Error().stack)
        setState(s => ({ ...s!, permission: 'pending' }));

        if (!sandbox()) setSandbox(await createNameLater())
        else if (!!stream()) await stopCameraStream(false);

        const result = await send(sandbox()!.window, 'requestPermission', undefined as never)

        if (RETRY_ENABLED && matchesPermission(result.permission, ...retryAblePermissions)) {
        
            await stopCameraStream(true);

            requestAttempt++;
            if (requestAttempt > features.RETRY_MAX) {
                result.permission = 'error:inuse'
                return setState(result as UserMediaState);
            }

            await forMilliseconds(1500, abortSignal);
            await requestPermission(false);

            return state()!;
        }

        requestAttempt = 0;

        if (!result.camera?.streamId) return setState(result as UserMediaState)

        if (result.camera.streamId !== stream()?.id) throw new Error('illegal state, incorrect stream id');
        return setState({ ...result, camera: { ...result.camera, stream: stream() } })
    }
    async function stop() {
        setState(s => ({ ...s!, permission: 'pending' }));
        
        await stopCameraStream(true)

        setState(s => ({ ...s!, permission: 'unknown' }));
    }

    async function stopCameraStream(deleteStream: boolean) {
        
        // Stop stream here
        await stopStream(stream());
        setStream(undefined);

        // Stop stream in owner window
        if (!deleteStream) {
            await send(sandbox()!.window, 'stop', undefined as never)
            setState(s => ({ ...s!, permission: 'unknown' }));
            return
        }

        // Kill stream in owner window
        await send(sandbox()!.window, 'stop', undefined as never)
        await sandbox()!.close(deleteStream);
        setSandbox(undefined)
    }

    onMount(async () => {

        setSandbox(await createNameLater());

        setState({
            permission: 'unknown',
            camera: undefined,
            devices: undefined
        });
        setRef({
            state: state as Accessor<UserMediaState>,
            requestPermission,
            stop
        });
    })

    onCleanup(async () => {
        if (abortController.signal.aborted) return;
        await stop()
    })

    // onMount(() => registerParentHandlers(uid, abortController.signal, async (event) => {

    //     const initializing = !state();

    //     // Do nothing until initialized
    //     if (initializing) await forwardEvent(event, 'initialized', initialized);
    //     if (initializing) return;

    // }))

    // return <Portal ref={(element) => {
    //     element.id = 'camera-access';
    //     element.style.display = 'none';
    // }} useShadow>
    //     {active() && <Sandbox<CameraAccessWrapperProps>
    //         ref={(el) => setTargetWindow(el!.contentWindow!)}
    //         allow={formatPermissions(constraints)}
    //         sandbox="allow-same-origin allow-scripts allow-forms"
    //         module={wrapperModule.url}
    //         moduleProps={{ constraints, appName, postStream: setStream }}
    //         uid={uid}
    //     />}
    // </Portal>

    return undefined
}