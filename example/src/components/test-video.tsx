import { Component, createMemo } from 'solid-js';
import { useCamera } from '@solid-medley/camera-context';
import { VideoPlayer } from '@solid-medley/camera-context/components';

// TODO figure out why this binding is necessary
export const TestVideo: Component = () => {

    const cameraContext = useCamera();

    const returnData = createMemo(() => {

    if (cameraContext.state().permission !== 'granted') return undefined;
    return <>
        <p>{cameraContext.state().camera?.name}</p>
        <VideoPlayer muted />
    </>
    
    }, [cameraContext.state]);

    return <>{returnData()}</>
}