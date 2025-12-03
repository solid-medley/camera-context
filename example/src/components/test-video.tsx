import { Component, JSX } from 'solid-js';
import { useCamera } from '@solid-medley/camera-context';
import { VideoDeviceSelector, VideoPlayer, StartStopIconButton } from '@solid-medley/camera-context/components';

import './test-video.css'

const noStreamStyle: JSX.CSSProperties = {
    "object-fit": "cover"
}

export const TestVideo: Component = () => {

    const { browser, stream } = useCamera();


    return <>
        <div class="video-selector">
            <VideoDeviceSelector /> <StartStopIconButton />
        </div>
        <VideoPlayer muted style={{
            width: '100%',
            ...(!!stream() ? { } : noStreamStyle), 
            "max-width": `500px`,
            // TODO move to css with breakpoints
            "aspect-ratio": browser.platform.type === 'desktop'
                ? '16/9'
                : '3/4'
        }}/>
    </>
}