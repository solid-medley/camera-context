import { Component } from 'solid-js';
import { useCamera } from '@solid-medley/camera-context';


export const TestButton: Component = () => {

    const cameraContext = useCamera();

    return <button disabled={!cameraContext.canRequest()} onClick={cameraContext.requestPermission}>Test</button>
}