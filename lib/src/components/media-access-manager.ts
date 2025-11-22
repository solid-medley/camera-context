import { requestMediaPermission } from '../helpers/media-helper'
import type { UserMediaState } from "../data-models/device";
import { sandboxModule } from "./sandbox.module";
import { Accessor } from 'solid-js';

// These imports need to be await import for the bundler
const { registerChildHandlers, forwardEvent, sendCallback } = await import("./sandbox.helpers");
const { logModule }  = await import('../helpers/debug-helper');
const { closeMediaStream } = await import("../helpers/stream-helper");

logModule('media-access-manager', import.meta)

export type MediaAccessManager = {
    state: Accessor<UserMediaState>
    requestPermission(constraints: MediaStreamConstraints): Promise<UserMediaState>
    stopStreaming(): Promise<void>
}
export type MediaAccessManagerConfig = {
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
    postStream 
}) => {

    registerChildHandlers(parent, abortSignal, async (event) => {
        await forwardEvent(event, 'requestPermission', requestPermission)
        await forwardEvent(event, 'stopStream', stopStream)
    })

    let mediaStream: MediaStream | undefined = undefined;
    async function requestPermission(constraints: MediaStreamConstraints) {
        if (!!mediaStream) {
            await endStream();
        }

        const userMediaResult = await requestMediaPermission(constraints, appName)
        if (userMediaResult.stream) {

            mediaStream = userMediaResult.stream;
            postStream(Object.assign(userMediaResult.stream, { stopped: false }))

            await sendCallback(parent, 'requestPermission', { ...userMediaResult, stream: undefined })
            return
        }


        await sendCallback(parent, 'requestPermission', userMediaResult)
    }

    async function stopStream() {

        await endStream();
        await sendCallback(parent, 'stopStream', void 0);
    }

    async function endStream() {

        if (!mediaStream) return;
        postStream(undefined);
        await closeMediaStream(mediaStream)
        mediaStream = undefined;
    }
});
