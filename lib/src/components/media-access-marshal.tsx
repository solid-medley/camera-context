import { Accessor, Component, createSignal, createUniqueId, onCleanup, onMount, Setter, } from "solid-js";
import { createSandbox, SandBox } from "./sandbox";
import type { UserMediaState } from "../data-models/device";
import { forMilliseconds } from "../helpers/timeout";
import { hasPermission, matchesPermission } from "../camera-context";
import { stopStream } from "../helpers/stream-helper";
import { createAbortSignal } from "../helpers/create-abort";
import { features, retryAblePermissions } from "../constants";
import { logModule } from "../helpers/debug-helper";

// These imports HAVE to be type imports for the bundler
import type { MediaAccessManager, MediaAccessManagerConfig, MediaAccessManagerProps } from './media-access-manager';
// These imports are await imports on purpose for the bundler
const { send } = await import('./sandbox.helpers')
const wrapperModule = (await import('./media-access-manager')).default;

logModule('media-access-marshal', import.meta)

const RETRY_ENABLED = features.RETRY_MAX > 0;


export type MediaAccessMarshalProps = MediaAccessManagerConfig & {
    ref: Setter<MediaAccessManager | undefined>
}

export const MediaAccessMarshal: Component<MediaAccessMarshalProps> = ({ constraints, appName, ref: setRef }) => {

    const [abortSignal] = createAbortSignal();

    const [state, setState] = createSignal<UserMediaState>();
    const [stream, setStream] = createSignal<MediaStream>();

    const [sandbox, setSandbox] = createSignal<SandBox>()
    const uid = createUniqueId()

    const createMediaAccessManager = () => createSandbox<MediaAccessManagerProps>(wrapperModule.url, {
        uid,
        abortSignal,
        allow: formatSandboxPermissions(constraints),
        sandbox: "allow-same-origin allow-scripts" + (features.DEBUG_ERROR_ALERT 
            ? " allow-forms allow-modals" 
            : ""),
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

        setState(s => ({ ...s!, permission: 'pending' }));

        if (!sandbox()) setSandbox(await createMediaAccessManager())
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

        setSandbox(await createMediaAccessManager());

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
        await stop()
    })

    return undefined
}

function formatSandboxPermissions(constraints: MediaStreamConstraints): string | undefined {
    const allowAudio = constraints ? !!constraints.audio : true
    if (!allowAudio) return "camera 'src'"
    return "camera 'src'; microphone 'src'"
}