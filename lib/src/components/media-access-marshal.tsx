import { Accessor, Component, createSignal, createUniqueId, onCleanup, onMount, Setter, } from "solid-js";
import { createSandbox, SandBox } from "./sandbox";
import type { UserMediaState } from "../data-models/device";
import { forMilliseconds } from "../helpers/timeout";
import { closeMediaStream } from "../helpers/stream-helper";
import { createAbortSignal } from "../helpers/create-abort";
import { features, retryAblePermissions } from "../constants";
import { logModule } from "../helpers/debug-helper";
import type{ InternalMediaConstraints } from "../data-models/constraints";

// These imports HAVE to be type imports for the bundler
import type { MediaAccessManagerConfig, MediaAccessManagerProps } from './media-access-manager';
// These imports are await imports on purpose for the bundler
const { send } = await import('./sandbox.helpers')
const { hasPermission, matchesPermission } = await import('../data-models/device')
const wrapperModule = (await import('./media-access-manager')).default;

logModule('media-access-marshal', import.meta)

const RETRY_ENABLED = features.RETRY_MAX > 0;

export type MediaAccess = {
    state: Accessor<UserMediaState>
    requestPermission(constraints: MediaStreamConstraints): Promise<UserMediaState>
    changeVideoInput(deviceId: string): Promise<void>
    stopStreaming(): Promise<void>
}
export type MediaAccessMarshalProps = MediaAccessManagerConfig & {
    ref: Setter<MediaAccess | undefined>
}

export const MediaAccessMarshal: Component<MediaAccessMarshalProps> = ({ appName, ref: setRef }) => {

    const [abortSignal] = createAbortSignal();

    const [state, setState] = createSignal<UserMediaState>();
    const [mediaStream, setMediaStream] = createSignal<MediaStream>();
    const [usedConstraints, setConstraints] = createSignal<InternalMediaConstraints>();

    const [sandbox, setSandbox] = createSignal<SandBox>()
    const uid = createUniqueId()

    const createMediaAccessManager = (constraints: MediaStreamConstraints) => createSandbox<MediaAccessManagerProps>(wrapperModule.url, {
        uid,
        abortSignal,
        allow: formatSandboxPermissions(constraints),
        sandbox: "allow-same-origin allow-scripts" + (features.DEBUG_ERROR_ALERT 
            ? " allow-forms allow-modals" 
            : ""),
        props: {
            appName,
            postStream: setMediaStream,
        },
    });

    let requestAttempt = 0;
    async function requestPermission(constraints: InternalMediaConstraints, initial = true) {
        if (initial) requestAttempt = 0;

        // ANTI-LOOP
        if (hasPermission(state(), 'denied', 'denied:system', 'error:no-support')) return state()!;
        if (requestAttempt > features.RETRY_MAX) return state()!;

        if (!constraints) alert('wtf')
        setState(s => ({ ...s!, permission: 'pending', usedConstraints: setConstraints(constraints)! }));
        console.log('usedConstraints', usedConstraints())

        if (!!mediaStream() || !!sandbox()) await closeMediaStreamInternal(false);
        const requestSandbox = await createMediaAccessManager(constraints)
        setSandbox(requestSandbox)

        const result = await send(requestSandbox!.window, 'requestPermission', constraints)

        if (RETRY_ENABLED && matchesPermission(result.permission, ...retryAblePermissions)) {
        
            requestAttempt++;
            if (requestAttempt > features.RETRY_MAX) {
                result.permission = 'error:inuse'
                return setState({ ...result } as UserMediaState);
            }

            await forMilliseconds(1500, abortSignal);
            await requestPermission(constraints, false);

            return state()!;
        }

        requestAttempt = 0;

        if (!result.camera?.streamId) return setState(result as UserMediaState);

        const stream = mediaStream();
        if (result.camera.streamId !== stream?.id) throw new Error('illegal state, incorrect stream id');
        return setState({ ...result, stream })
    }
    async function stopStreaming() {
        setState(s => ({ ...s!, permission: 'pending' }));
        await closeMediaStreamInternal(true)
        setState(s => ({ ...s!, permission: 'unknown' }));
    }

    async function closeMediaStreamInternal(deleteStream: boolean) {
        
        // Stop stream here
        const activeStream = mediaStream();
        if(activeStream) setState((s) => ({ ...s!, stream: activeStream }))
        await closeMediaStream(activeStream);
        setState((s) => ({ ...s!, stream: undefined }))
        setMediaStream(undefined)

        // Kill stream in owner window
        if (!sandbox()) return;
        await send(sandbox()!.window, 'stopStream', undefined as never)
        await sandbox()!.close(deleteStream);
        setSandbox(undefined)
    }

    async function changeVideoInput(uid: string) {
        setState(s => ({ ...s!, permission: 'pending' }));
        const constraints = usedConstraints();
        console.log('changeVideoInput', 'usedConstraints', constraints)
        await closeMediaStreamInternal(true)
        requestPermission({ ...constraints, video: { uid } })
    }

    onMount(() => {

        setState(c => ({ 
            ...c,
            permission: 'unknown',
            camera: undefined,
            stream: undefined,
            usedConstraints: usedConstraints() ?? { }
        }));
        setRef({
            state: state as Accessor<UserMediaState>,
            requestPermission:(c: MediaStreamConstraints) => requestPermission(c),
            stopStreaming,
            changeVideoInput
        });
    })

    onCleanup(async () => {
        await stopStreaming()
    })

    return undefined
}

function formatSandboxPermissions(constraints: MediaStreamConstraints): string | undefined {
    const allowAudio = constraints ? !!constraints.audio : true
    if (!allowAudio) return "camera 'src'"
    return "camera 'src'; microphone 'src'"
}
