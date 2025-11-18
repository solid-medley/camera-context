
export function stopStream(stream: MediaStream | null | undefined) {
    if (!stream) return;

    for (const track of stream.getTracks()) {
        if (track.readyState === 'ended') continue
        track.stop()
        track.enabled = false
        stream.removeTrack(track);
    }

    // Backwards compatibility
    try {
        if ('stop' in stream) (stream as any).stop()
    } catch {
        //
    }
}