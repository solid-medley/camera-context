import { Accessor, Component, createEffect, createMemo, createSignal, JSX } from 'solid-js';
import { useCamera } from '../camera-context';
import { createStaticStream } from '../helpers/static-image';

type VideoElementProps = Omit<JSX.VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'srcObject' | 'ref' | 'loop'>;
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
const ContextVideoPlayer: Component<ContextVideoPlayerProps> = ({ elementProps }) => {

    const { stream } = useCamera();

    return <StreamPlayer stream={stream} elementProps={elementProps} />
}
export type StreamPlayerProps = {
    stream: Accessor<MediaStream | undefined>
    elementProps: VideoElementProps
}
const StreamPlayer: Component<StreamPlayerProps> = ({ stream, elementProps }) => {

    const [ref, setRef] = createSignal<HTMLVideoElement>()    
    const { configuration } = useCamera();
    const staticStream = createStaticStream(configuration.noSignalText);

    createEffect(() => {
        console.log('stream', stream()?.id)
        const video = ref();
        if (!video) return;
        const activeStream = stream() ?? staticStream();
        video.srcObject = activeStream
        video.removeAttribute('src')

        if (!video.srcObject) video.pause()
        video.onloadedmetadata = () => {
            if (!video.srcObject) video.pause()
            if ((video.srcObject as MediaStream | undefined)?.active) video.play()
            console.log('srcObject', video.srcObject)
        }

        if (import.meta.env.DEV) {
            video.setAttribute('data-stream', activeStream?.id ?? 'no-stream')
            if (!activeStream) video.removeAttribute('data-srcObject')
            else video.setAttribute('data-srcObject', (video.srcObject! as MediaStream)?.id ?? '')
        }
    }, [stream, ref])

    return <video {...elementProps} ref={setRef} loop playsinline />
}
