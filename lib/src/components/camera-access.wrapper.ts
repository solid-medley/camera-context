import type { SandboxedModule } from "./sandbox";
import { requestMediaPermission } from '../helpers/camera-helper'
import type { CameraAccessConfig } from "./camera-access";
import { TransferrableUserMediaState } from "../data-models/device";

// TODO move the to-and-fro conversion from a stream to a channel to a separate file.
// TODO figure out why the typing file doesn't work correctly
declare const MediaStreamTrackProcessor: any

export const url = import.meta.url
const { registerChildHandlers, forwardEvent, send, sendCallback } = await import("./sandbox.helpers");

const cameraAccessWrapper: SandboxedModule<CameraAccessConfig & { test: (a: any) => void}> = async ({ parent, abortSignal, initialState }) => {

    const { constraints, appName } = initialState;

    async function requestPermission() {
        const userMediaResult = await requestMediaPermission(constraints, true, appName)
        if (userMediaResult.camera?.stream) {
            const { stream, ...camera }  = userMediaResult.camera!
            initialState.test(stream)

            const track = stream!.getVideoTracks()[0];

            const processor = new MediaStreamTrackProcessor({ track });
            const reader = processor.readable.getReader();

            const channel = new MessageChannel();

            const transferrableCamera = {
                ...camera,
                stream: channel.port2
            }

            await sendCallback(parent, 'requestPermission', { ...userMediaResult, camera: transferrableCamera }, [channel.port2])

            while (true) {
                const { value: frame, done } = await reader.read();
                if (done) break;
                if ((frame as VideoFrame).codedWidth === 0) continue;

                channel.port1.postMessage(frame, [frame]);
            }
            return
        }


        await sendCallback(parent, 'requestPermission', userMediaResult as TransferrableUserMediaState)
    }

    registerChildHandlers(parent, abortSignal, async (event) => {
        await forwardEvent(event, 'requestPermission', requestPermission)
    });

    await send(parent, 'initialized', undefined as never)
}

export default cameraAccessWrapper;