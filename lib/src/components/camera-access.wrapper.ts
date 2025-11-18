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
            const { stream, ...camera }  = userMediaResult.camera!
            
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

        for (const track of mediaStream.getTracks()) {
				if (track.readyState === 'ended') continue
				track.stop()
				track.enabled = false
        }
        
        // Backwards compatibility
        try {
            if ('stop' in mediaStream) (mediaStream as any).stop()
        } catch {
            //
        }

        mediaStream = undefined;

        await sendCallback(parent, 'stop', void 0);
    }
});