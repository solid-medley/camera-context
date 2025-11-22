import { Accessor, createSignal } from "solid-js";
import { createAbortSignal } from "./create-abort";

// TODO this can be pre-generated, and perhaps optimized
const numFrames = 6;
const width = 220;
const height = 140;
function createFakeStaticStream(streamActive: Accessor<boolean>, abortSignal: AbortSignal) {

    if (!streamActive() || abortSignal.aborted) return null
    
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
        ctx.lineWidth = 3;
        ctx.strokeText('No Signal', 10, 30);
        ctx.fillText('No Signal', 10, 30);

        frames[frameIndex] = ctx.getImageData(0,0,width, height);
    }

    let currentFrame = 0;
    const iii = setInterval(() => {
        // TODO test if actually stopping the interval on change is better?
        if (!streamActive()) return;
        ctx.putImageData(frames[currentFrame], 0, 0);
        currentFrame = (currentFrame + 1) % frames.length;
    }, 10);

    abortSignal.addEventListener('abort', () => clearInterval(iii), { once: true })
    abortSignal.addEventListener('abort', () => canvas.remove(), { once: true })

    const stream = canvas.captureStream(12);
    abortSignal.addEventListener('abort', () => {
        if (!stream.active) return;
        if (!stream.getAudioTracks()) return
        if (!stream.getAudioTracks().length) return
        stream.getAudioTracks()[0]?.stop()
    }, { once: true })

    return Object.defineProperty(stream, 'id', { value: 'no-signal', writable: true });
}

// TODO add logic to (de)activate on page focus/blur
export function createStaticStream(): Accessor<MediaStream | null> {

    const [streamActive, setStreamActive] = createSignal(true);
    const [abortSignal] = createAbortSignal();
    abortSignal.addEventListener('abort', () => setStreamActive(false), { once: true });

    const stream = createFakeStaticStream(
        streamActive,
        abortSignal
    )

    return () => abortSignal.aborted || !streamActive() ? null : stream;
} 