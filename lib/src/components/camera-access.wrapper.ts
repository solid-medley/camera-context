import type { SandboxedModule } from "./sandbox";
import { requestMediaPermission } from '../helpers/camera-helper'
import type { CameraAccessConfig } from "./camera-access";

export const url = import.meta.url
const { registerChildHandlers, forwardEvent, send, sendCallback } = await import("./sandbox.helpers");

const cameraAccessWrapper: SandboxedModule<CameraAccessConfig> = async ({ parent, abortSignal, initialState }) => {
   
    const { constraints, appName } = initialState;
    
    async function requestPermission() {
        const userMediaResult = await requestMediaPermission(constraints, true, appName)
        await sendCallback(parent, 'requestPermission', userMediaResult)
    }

    registerChildHandlers(parent, abortSignal, async (event) => {
        await forwardEvent(event, 'requestPermission', requestPermission)
    });

    await send(parent, 'initialized', undefined as never)
}

export default cameraAccessWrapper;