import { Accessor, createSignal } from "solid-js";
import { createAbortSignal } from "./create-abort";

// TODO this can be pre-generated, and perhaps optimized
const numFrames = 6;
const width = 200;
const height = 200;
function createFakeStaticStream(noSignalText: string, streamActive: Accessor<boolean>, abortSignal: AbortSignal) {

    if (!streamActive() || abortSignal.aborted) return null
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = 'none'

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const frames = new Array<ImageData>(numFrames)
    for (let frameIndex = 0; frameIndex <= numFrames; frameIndex++) {
        const imageData = ctx.createImageData(width, height);

        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            const v = Math.random() * 255;
            pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
            pixels[i + 3] = 255;
        }

        if(!noSignalText) {
            frames[frameIndex] = imageData
            continue;
        }

        ctx.putImageData(imageData, 0,0)

        ctx.fillStyle = 'white';
        ctx.font = '2em monospace';
        ctx.lineWidth = 3;
        
        ctx.strokeText(noSignalText, width/2, height /2);
        ctx.fillText(noSignalText, width/2, height /2);
        

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
export function createStaticStream(noSignalText?: string | undefined): Accessor<MediaStream | null> {

    const [streamActive, setStreamActive] = createSignal(true);
    const [abortSignal] = createAbortSignal();
    abortSignal.addEventListener('abort', () => setStreamActive(false), { once: true });

    const stream = createFakeStaticStream(
        noSignalText ?? '',
        streamActive,
        abortSignal
    )

    return () => abortSignal.aborted || !streamActive() ? null : stream;
} 