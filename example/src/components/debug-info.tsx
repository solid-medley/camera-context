import { Component, createMemo } from "solid-js"
import { useCamera } from "../../../lib/dist/camera-context"

export const DebugInfo: Component = () => {

    const ctx = useCamera()
    
    const display = createMemo(() => {

        const devices = ctx.mediaDevices();

        return JSON.stringify({
            permission: ctx.permission(),
            camera: ctx.camera(),
            stream: !ctx.stream() ? undefined : { 
                id: ctx.stream()?.id,
                active: ctx.stream()?.active,
            },
            browser: ctx.browser,
            configuration: ctx.configuration,
            devices: typeof devices === 'string' 
                ? devices
                : {
                    videoInput: devices.videoInput.map(dev => ({ ...dev, capabilities: undefined })),
                    audioInput: devices.audioInput.map(dev => ({ ...dev, capabilities: undefined })),
                    audioOutput: devices.audioOutput.map(dev => ({ ...dev, capabilities: undefined }))
                } 
        }, null, 2)
    }, [ctx.permission, ctx.camera, ctx.stream, ctx.mediaDevices])
    
    
    return <pre style={{ "overflow-x": 'scroll' }}>{display()}</pre>
}