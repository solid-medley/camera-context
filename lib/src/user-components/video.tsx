import { Accessor, Component, createEffect, createMemo, createSignal } from 'solid-js';
import { useCamera } from '../camera-context';

export type VideoPlayerProps = {
    /** If no stream is provided, the camera context is used */
    stream?: Accessor<MediaStream | undefined> | undefined
}

export const VideoPlayer: Component<VideoPlayerProps> = (props) => {

    const player = createMemo(() => {
        if (props.stream) return <StreamPlayer stream={props.stream} />
        return <ContextVideoPlayer />
    }, [props.stream])

    return <>{player()}</>
}

const ContextVideoPlayer: Component = () => {

    const cameraContext = useCamera();
    const stream = createMemo(
        () => cameraContext.state()?.camera?.stream, 
        [cameraContext.state]
    )

    return <StreamPlayer stream={stream} />
}
export type StreamPlayerProps = {
    /** If no stream is provided, the camera context is used */
    stream: Accessor<MediaStream | undefined>
}
const StreamPlayer: Component<StreamPlayerProps> = ({ stream }) => {

    const [ref, setRef] = createSignal<HTMLVideoElement>()

    createEffect(() => {
        const video = ref();
        if (!video) return;
        const activeStream = stream();
        video.srcObject = activeStream ?? null;
        video.removeAttribute('src')

        if (!activeStream?.active) video.pause()
        video.onloadedmetadata = () => {
            if (activeStream?.active) video.play()
            if (!activeStream?.active) video.pause()
        }

        if (import.meta.env.DEV) {
            video.setAttribute('data-stream', activeStream?.id ?? '')
            video.setAttribute('data-srcObject', (video.srcObject! as MediaStream)?.id ?? '')
        }
    })

    return <video ref={setRef} loop />
}