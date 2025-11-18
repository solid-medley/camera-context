import { Accessor, Component, createSignal, createUniqueId, onCleanup, onMount, Setter } from "solid-js";
import { createSandbox, SandBox } from "./sandbox";
import type { UserMediaState } from "../data-models/device";
import type { CameraAccessWrapperProps } from './camera-access.wrapper';
import { forMilliseconds } from "../helpers/timeout";

const { send } = await import('./sandbox.helpers')
const wrapperModule = (await import('./camera-access.wrapper')).default;

// function formatPermissions(constraints: MediaStreamConstraints): string | undefined {
//     const allowAudio = constraints ? !!constraints.audio : true
//     if (!allowAudio) return "camera 'src'"
//     return "camera 'src'; microphone 'src'"
// }

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

    const abortController = new AbortController();
    onCleanup(() => abortController.abort('unmount'));

    // const [active, setActiveState] = createSignal<boolean>(true);
    const [state, setState] = createSignal<UserMediaState>();
    const [stream, setStream] = createSignal<MediaStream>();

    const [sandbox, setSandbox] = createSignal<SandBox>()
    const uid = createUniqueId()

    const createNameLater = () => createSandbox<CameraAccessWrapperProps>(wrapperModule.url, {
        uid,
        abortSignal: abortController.signal,
        // allow: formatPermissions(constraints),
        // sandbox: "allow-same-origin allow-scripts allow-forms",
        props: {
            appName,
            constraints,
            postStream: setStream,
        }
    });

    async function requestPermission() {
        setState(s => ({ ...s!, permission: 'pending' }));

        setSandbox(await createNameLater());
        const result = await send(sandbox()!.window, 'requestPermission', undefined as never)
        
        if (result.permission.toString() === 'error:inuse:retry') {
            // TODO track retries max 3

            await stop();
            await forMilliseconds(500, abortController.signal);
            await requestPermission();
            return;
        }

        if (!result.camera?.streamId) return setState(result as UserMediaState)

        if (result.camera.streamId !== stream()?.id) throw new Error('illegal state, incorrect stream id');
        return setState({ ...result, camera: { ...result.camera, stream: stream() } })
    }
    async function stop() {
        setState(s => ({ ...s!, permission: 'pending' }));
        setStream(undefined);
        // First cleanly stop stream
        await send(sandbox()!.window, 'stop', undefined as never)
        // Then close the sandbox
        await sandbox()!.close();

        // See if retrying with no constraints helps
        if (constraints.video) {
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            }).catch((e) => alert('video ' + e.message))
        }
        if (constraints.audio) {
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            }).catch((e) => alert('video ' + e.message))
        }

        setState(s => ({ ...s!, permission: 'unknown' }));
        // // Then unmount the component
        // // setActiveState(false)
        // // Disabling the camera seems to take a while.
        // const timeOutId = setTimeout(() => {
        //     // setActiveState(true);
        //     setState(s => ({ ...s!, permission: 'unknown' }));
        // }, 600)
        // abortController.signal.addEventListener('abort', () => clearTimeout(timeOutId), { once: true })
    }

    onMount(async () => {

        // Try to create once
        const sandbox = await createNameLater()
        await sandbox.close()

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