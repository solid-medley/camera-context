import { Component } from 'solid-js';
import { useCamera } from '@solid-medley/camera-context';


export const TestButton: Component = () => {

    const cameraContext = useCamera();

    return <>
        <button disabled={!cameraContext.canRequest()} onClick={cameraContext.requestPermission}>Request Cam</button> 
        <button disabled={!cameraContext.hasPermission('granted')} onClick={cameraContext.stop}>Stop</button> 
    </>
}