import { Component, createSignal, createEffect, createMemo, onCleanup, onMount, Accessor } from "solid-js";
import { useCamera } from "@solid-medley/camera-context";
import "./audio-level.css";

type AudioLevelProps = {
  peakHold?: boolean;
};

export const AudioLevel: Component<AudioLevelProps> = ({ peakHold }) => {
  const { stream } = useCamera();

  const [volume, setVolume] = createSignal(0);
  const [barCount, setBarCount] = createSignal(0);
  const [container, setContainer] = createSignal<HTMLDivElement>();

  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let dataArray: Uint8Array<ArrayBuffer> | null = null;
  let frame = 0;

  // Audio loop
  const tick = () => {
    frame = requestAnimationFrame(tick);
    if (!analyser || !dataArray) return;

    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += Math.abs(dataArray[i] - 128);
    }

    const amplitude = sum / dataArray.length / 128;
    const scaled = Math.log10(1 + 9 * amplitude);

    setVolume(prev => Math.max(scaled, prev * 0.8));
  };

  // Handle stream start/stop
  createEffect(() => {
    const s = stream();

    if (!s) {
      cancelAnimationFrame(frame);
      audioContext?.close();
      audioContext = null;
      analyser = null;
      dataArray = null;
      setVolume(0);
      return;
    }

    audioContext = new AudioContext();
    const src = audioContext.createMediaStreamSource(s);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser);

    tick();
  });

  onCleanup(() => {
    cancelAnimationFrame(frame);
    audioContext?.close();
  });

  // ResizeObserver to set bar count
  onMount(() => {
    const el = container();
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const newCount = Math.max(1, Math.floor(el.clientWidth / 10));
      setBarCount(newCount);
    });

    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  // Memoized bars
  const bars = createMemo(() => {
    const count = barCount();
    const vol = volume();
    return new Array(count).fill("").map((_, i) => {
      const threshold = (i + 1) / count;
      let color = "green";
      if (threshold >= 0.7 && threshold < 0.9) color = "orange";
      else if (threshold >= 0.9) color = "red";

      return <div class={`bar ${color}`} data-active-level={vol >= threshold} />;
    });
  });

  const active = createMemo(() => !!stream() && stream()?.id !== "no-signal");

  return (
    <div class="audio-level" data-active={active()} ref={setContainer}>
      <div class="bars">{bars()}</div>
      {peakHold && active() && <PeakHold volume={volume} barCount={barCount} />}
    </div>
  );
};

// PeakHold component
type PeakHoldProps = {
  volume: Accessor<number>;
  barCount: Accessor<number>;
};

export const PeakHold = ({ volume, barCount }: PeakHoldProps) => {
  let peakIndex = 0;
  let lastPeakTime = 0;

  const peakBars = createMemo(() => {
    const count = barCount();
    const vol = volume();
    if (count === 0) return [];

    const volIndex = Math.floor(vol * count);

    if (volIndex > peakIndex) {
      peakIndex = volIndex;
      lastPeakTime = performance.now();
    } else {
      const elapsed = performance.now() - lastPeakTime;
      const hold = 600;
      const decayRate = 20;
      if (elapsed > hold) {
        peakIndex = Math.max(0, peakIndex - Math.floor(decayRate * ((elapsed - hold) / 1000)));
      }
    }

    return new Array(count).fill("").map((_, i) => (
      <div class="peak-bar" data-active-level={i === peakIndex} />
    ));
  });

  return <div class="peak-hold">{peakBars()}</div>;
};
