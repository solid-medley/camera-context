
export async function closeMediaStream(stream: MediaStream | null | undefined) {
    if (!stream) return;

    // TODO figure something out
    // const streamEnded = new Promise<void>(res => {
    //     stream.addEventListener('removetrack', () => res(), {once: true, capture: true})
    // })

    for (const track of stream.getTracks()) {
        if (track.readyState === 'ended') {
            stream.removeTrack(track);
            continue
        }
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

    // streamEnded.then(() => console.log('e'))
}