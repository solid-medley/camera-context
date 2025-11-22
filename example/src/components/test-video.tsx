import { Component, createMemo } from 'solid-js';
import { useCamera } from '@solid-medley/camera-context';
import { VideoPlayer } from '@solid-medley/camera-context/components';

// TODO figure out why this binding is necessary
export const TestVideo: Component = () => {

    const { camera } = useCamera();

    return <>
        <p>{camera()?.name ?? 'no video stream'}</p>
        <VideoPlayer muted style={{
            width: '100%',
            "aspect-ratio": '1/1'
        }}/>
    </>
}