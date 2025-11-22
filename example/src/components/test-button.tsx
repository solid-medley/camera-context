import { Component } from 'solid-js';
import { useCamera } from '@solid-medley/camera-context';
import { VideoDeviceSelector } from '@solid-medley/camera-context/components';

export const TestButton: Component = () => {

    const { requestPermission, stopStreaming, active, idle, faulted, has } = useCamera();

    async function getPermissionFront() {
        await requestPermission({
            video: {
                facingMode: 'user'
            },
            audio: true
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
        <div>
            <button disabled={active() || has('pending')} onClick={getPermissionBack}>Request Device Cam</button>
            <button disabled={active() || has('pending')} onClick={getPermissionFront}>Request Face Cam</button>
            <button disabled={idle() || faulted() || has('pending')} onClick={stopStreaming}>Stop</button>
        </div>
        <div>
            <p>This doesn't change the camera yet</p>
            {/* Disable for now */}
            <VideoDeviceSelector disabled />
        </div>
    </>
}