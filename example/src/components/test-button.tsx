import { Component } from 'solid-js';
import { useCamera } from '../../../lib/src/camera-context';


export const TestButton: Component = () => {

    const cameraContext = useCamera();

    return <button onClick={cameraContext.requestPermission}>Test</button>
}