import { Component } from 'solid-js';
import { useCamera } from '@solid-medley/camera-context';

export const TestButton: Component = () => {

    const { requestPermission, stopStreaming, active, idle, faulted } = useCamera();

    async function getPermissionFront() {
        debugger;
        await requestPermission({
            video: {
                facingMode: 'user'
            }
        });
    }
    async function getPermissionBack() {
        await requestPermission({
            video: {
                facingMode: 'environment'
            }
        });
    }
    return <>
        <button disabled={active()} onClick={getPermissionBack}>Request Device Cam</button> 
        <button disabled={active()} onClick={getPermissionFront}>Request Face Cam</button> 
        <button disabled={idle() || faulted()} onClick={stopStreaming}>Stop</button> 
    </>
}