import { Component, onCleanup, onMount, createEffect, createSignal } from "solid-js";
import { useCamera } from "../../../lib/dist/camera-context";
import { AudioLevel } from "./audio-level";

export const TestAudio: Component = () => {
    return <>
        <TestAudioInput />
        <AudioLevel peakHold />
    </>
}
export const TestAudioInput: Component = () => {
  let canvas!: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  const { stream } = useCamera(); // Accessor<MediaStream | undefined>

  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let dataArray: Uint8Array<ArrayBuffer> | null = null;
  let animationFrame = 0;

  // Draw loop reference
  const draw = () => {
    animationFrame = requestAnimationFrame(draw);

    if (!ctx || !analyser || !dataArray) return;

    analyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00ffaa";
    ctx.beginPath();

    const sliceWidth = canvas.width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  };

  onMount(() => {
    ctx = canvas.getContext("2d");
  });

  // 🔥 React to stream changes safely
  createEffect(() => {
    const s = stream(); // MediaStream | undefined

    // If no stream → cleanup and stop
    if (!s) {
      cancelAnimationFrame(animationFrame);
      audioContext?.close();
      audioContext = null;
      analyser = null;
      dataArray = null;
      return;
    }

    // Create AudioContext when a valid stream arrives
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(s);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);

    draw();
  });

  onCleanup(() => {
    cancelAnimationFrame(animationFrame);
    audioContext?.close();
  });

  return (
    <canvas
      ref={canvas}
      width={600}
      height={150}
      style="background: #111; display: block;"
    />
  );
};