import { requestMediaPermission } from '../helpers/camera-helper'
import type { CameraAccessConfig } from "./camera-access";
import { TransferrableUserMediaState } from "../data-models/device";
import { sandboxModule } from "./sandbox.module";

const { registerChildHandlers, forwardEvent, sendCallback } = await import("./sandbox.helpers");

export type CameraAccessWrapperProps =
    & {
        [Key in keyof CameraAccessConfig]: CameraAccessConfig[Key]
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

export default sandboxModule<CameraAccessWrapperProps>(import.meta, async ({ parent, abortSignal, constraints, appName, postStream }) => {

    registerChildHandlers(parent, abortSignal, async (event) => {
        await forwardEvent(event, 'requestPermission', requestPermission)
        await forwardEvent(event, 'stop', stop)
    })

    let mediaStream: MediaStream | undefined = undefined;
    async function requestPermission() {
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
        if (!mediaStream) return await sendCallback(parent, 'stop', void 0)

        stopStream(mediaStream)
        mediaStream = undefined;


        // See if retrying with no constraints helps
        if (constraints.video) {
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            }).then(stopStream).catch((e) => alert('video ' + e.message))
        }
        if (constraints.audio) {
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            }).then(stopStream).catch((e) => alert('video ' + e.message))
        }

        await sendCallback(parent, 'stop', void 0);
    }
});

function stopStream(stream: MediaStream | null | undefined) {
    if (!stream) return;

    for (const track of stream.getTracks()) {
        if (track.readyState === 'ended') continue
        track.stop()
        track.enabled = false
        stream.removeTrack(track);
    }

    // Backwards compatibility
    try {
        if ('stop' in stream) (stream as any).stop()
    } catch {
        //
    }
}