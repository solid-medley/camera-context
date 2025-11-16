import type { SandboxedModule } from "./sandbox";
export const url = import.meta.url

const { verifyParentOrigin, forwardEvent, event } = await import("./sandbox.helpers");

const cameraAccessWrapper: SandboxedModule<MediaStreamConstraints> = async ({ postMessage, abortSignal, initialState, parentOrigin }) => {
   
    
    async function requestPermission() {
        await navigator.mediaDevices.getUserMedia(initialState)
        postMessage({ cb: 'requestPermission' }, parentOrigin)
    }

    window.addEventListener("message", async (event) => {
        if (!verifyParentOrigin(parentOrigin, event)) return;

        forwardEvent(event, 'requestPermission', requestPermission)
        
    }, { signal: abortSignal })
}

export default cameraAccessWrapper;