import type { SandboxedModule } from "./sandbox";
import { requestMediaPermission } from '../helpers/camera-helper'
import type { CameraAccessConfig } from "./camera-access";

export const url = import.meta.url
const { verifyParentOrigin, forwardEvent } = await import("./sandbox.helpers");

const cameraAccessWrapper: SandboxedModule<CameraAccessConfig> = async ({ postMessage, abortSignal, initialState, parentOrigin }) => {
   
    const { constraints, appName } = initialState;
    
    async function requestPermission() {
        const userMediaresult = await requestMediaPermission(constraints, true, appName)
        postMessage({ cb: 'requestPermission', userMediaresult }, parentOrigin)
    }

    window.addEventListener("message", async (event) => {
        if (!verifyParentOrigin(parentOrigin, event)) return;

        forwardEvent(event, 'requestPermission', requestPermission)
        
    }, { signal: abortSignal })
}

export default cameraAccessWrapper;