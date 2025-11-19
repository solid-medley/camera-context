import { requestMediaPermission } from '../helpers/camera-helper'
import type { CameraAccessConfig } from "./camera-access";
import type { TransferrableUserMediaState } from "../data-models/device";
import { sandboxModule } from "./sandbox.module";

const { registerChildHandlers, forwardEvent, sendCallback } = await import("./sandbox.helpers");
const { stopStream } = await import("../helpers/stream-helper");

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
