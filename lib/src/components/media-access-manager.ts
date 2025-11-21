import { requestMediaPermission } from '../helpers/camera-helper'
import type { TransferrableUserMediaState, UserMediaState } from "../data-models/device";
import { sandboxModule } from "./sandbox.module";
import { Accessor } from 'solid-js';

// These imports need to be await import for the bundler
const { registerChildHandlers, forwardEvent, sendCallback } = await import("./sandbox.helpers");
const { logModule }  = await import('../helpers/debug-helper');
const { stopStream } = await import("../helpers/stream-helper");

logModule('media-access-manager')

export type MediaAccessManager = {
    state: Accessor<UserMediaState>
    requestPermission(): Promise<UserMediaState>
    stop(): Promise<void>
}
export type MediaAccessManagerConfig = {
    constraints: MediaStreamConstraints
    appName: string
}

export type MediaAccessManagerProps =
    & {
        [Key in keyof MediaAccessManagerConfig]: MediaAccessManagerConfig[Key]
    }
    & {
        /** 
         * Because a stream isn't StructureCloneable we just post it back to the parent window. 
         * 
         * The whole postmessage system is just so the IFrame owns the camera access, we can just pass the stream like this. \
         * And so, we will.
         */
        postStream(stream: MediaStream | undefined): void
    }

export default sandboxModule<MediaAccessManagerProps>(import.meta, async ({ 
    parent, abortSignal, appName, 
    constraints, postStream 
}) => {

    registerChildHandlers(parent, abortSignal, async (event) => {
        await forwardEvent(event, 'requestPermission', requestPermission)
        await forwardEvent(event, 'stop', stop)
    })

    let mediaStream: MediaStream | undefined = undefined;
    async function requestPermission() {
        if (!!mediaStream) {
            debugger;
            await endStream();
        }

        const userMediaResult = await requestMediaPermission(constraints, true, appName)
        if (userMediaResult.camera?.stream) {
            const { stream, ...camera } = userMediaResult.camera!

            mediaStream = stream;
            postStream(stream)
            const transferrableCamera = {
                ...camera,
                streamId: stream?.id
            }

            await sendCallback(parent, 'requestPermission', { ...userMediaResult, camera: transferrableCamera })
            return
        }


        await sendCallback(parent, 'requestPermission', userMediaResult as TransferrableUserMediaState)
    }

    async function stop() {

        await endStream();
        await sendCallback(parent, 'stop', void 0);
    }

    async function endStream() {

        if (!mediaStream) return;
        postStream(undefined);
        await stopStream(mediaStream)
        mediaStream = undefined;
    }
});
