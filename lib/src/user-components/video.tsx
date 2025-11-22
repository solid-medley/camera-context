import { Accessor, Component, createEffect, createMemo, createSignal, JSX } from 'solid-js';
import { useCamera } from '../camera-context';
import { StoppableStream } from '../data-models/device';
import { createAbortSignal } from '../helpers/create-abort';

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
    stream: Accessor<StoppableStream | MediaStream | undefined>
    elementProps: VideoElementProps
}
const StreamPlayer: Component<StreamPlayerProps> = ({ stream, elementProps }) => {

    const [ref, setRef] = createSignal<HTMLVideoElement>()
    const [abortSignal] = createAbortSignal();

    const staticStream = () => {
        if (!ref()) return null;
        // TODO width & height can be calculated with ratio
        const width = stream()?.getVideoTracks()[0].getSettings().width ?? ref()?.getBoundingClientRect().width ?? 100;
        const height = stream()?.getVideoTracks()[0].getSettings().height ?? ref()?.getBoundingClientRect().height ?? 100;
        return createFakeStaticStream(width, height, abortSignal)
    }

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

// TODO this can be pre-generated, and perhaps optimized
const numFrames = 6;
function createFakeStaticStream(streamWidth: number, streamHeight: number, abortSignal: AbortSignal) {

    if (streamWidth === 0 || streamHeight === null || abortSignal.aborted) return null
    
    const width = Math.ceil(streamWidth)
    const height = Math.ceil(streamHeight)

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = 'none'

    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#333';           // dark gray background
    ctx.fillRect(0, 0, width, height);

    const frames = new Array<ImageData>(numFrames)
    for (let frameIndex = 0; frameIndex <= numFrames; frameIndex++) {
        const imageData = ctx.createImageData(width, height);

        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            const v = Math.random() * 255;
            pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
            pixels[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0,0)

        // Optional: draw something else
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.fillText('No Signal', 10, 30);

        frames[frameIndex] = ctx.getImageData(0,0,width, height);
    }

    // TODO this should be abortable or at least pausable
    let currentFrame = 0;
    const iii = setInterval(() => {
        ctx.putImageData(frames[currentFrame], 0, 0);
        currentFrame = (currentFrame + 1) % frames.length;
    }, 10);

    abortSignal.addEventListener('abort', () => clearInterval(iii), { once: true })

    const stream = canvas.captureStream(12);
    return Object.defineProperty(stream, 'id', { value: 'no-signal', writable: true });
}