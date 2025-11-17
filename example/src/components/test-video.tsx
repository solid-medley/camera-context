import { Component } from 'solid-js';
import { useCamera } from '@solid-medley/camera-context';
import { VideoPlayer } from '@solid-medley/camera-context/components';


export const TestVideo: Component = () => {

    const cameraContext = useCamera();
    return <>
        <p>{cameraContext.state().camera?.name}</p>
        <VideoPlayer muted />
    </>
}