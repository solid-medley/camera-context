import { Component, createEffect, createMemo, createSignal } from 'solid-js';
import { useCamera } from '../../../lib/src/camera-context';


export const TestVideo: Component = () => {

    const [ref, setRef] = createSignal<HTMLVideoElement>()
    const cameraContext = useCamera();
    const stream = createMemo(() => {
        return cameraContext.state()?.camera?.stream ?? null
    }, [cameraContext.state])


    createEffect(() => {
        const video = ref();
        if (!video) return;
        const activeStream =  stream();
        video.srcObject = activeStream ?? null;
        if(activeStream?.active) video.play()
        if(!activeStream?.active) video.pause()
    })

    return <>
        <p>{cameraContext.state().camera?.name}</p>
        <video ref={setRef} />
    </>
}