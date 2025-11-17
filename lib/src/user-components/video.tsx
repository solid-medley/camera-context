import { Accessor, Component, createEffect, createMemo, createSignal, JSX } from 'solid-js';
import { useCamera } from '../camera-context';

type VideoElementProps = Omit<JSX.VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'srcObject' | 'ref' | 'loop'> ;
export type VideoPlayerProps = 
    & VideoElementProps
    & {
        /** If no stream is provided, the camera context is used */
        stream?: Accessor<MediaStream | undefined> | undefined
    }

export const VideoPlayer: Component<VideoPlayerProps> = (props) => {

    const { stream, ...elementProps } = props;

    const player = createMemo(() => {
        if (stream) return <StreamPlayer stream={stream} elementProps={elementProps} />
        return <ContextVideoPlayer elementProps={elementProps} />
    }, [props.stream])

    return <>{player()}</>
}

export type ContextVideoPlayerProps = {
    elementProps: VideoElementProps
}
const ContextVideoPlayer: Component<ContextVideoPlayerProps> = ({elementProps}) => {

    const cameraContext = useCamera();
    const stream = createMemo(
        () => cameraContext.state()?.camera?.stream, 
        [cameraContext.state]
    )

    return <StreamPlayer stream={stream} elementProps={elementProps} />
}
export type StreamPlayerProps = {
    stream: Accessor<MediaStream | undefined>
    elementProps: VideoElementProps
}
const StreamPlayer: Component<StreamPlayerProps> = ({ stream, elementProps }) => {

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

    return <video {...elementProps} ref={setRef} loop />
}