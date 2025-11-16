export async function debugFrame(frame: VideoFrame | undefined) {
    if (!frame) return;
    const drawFrame = frame.clone();

    const canvas = new OffscreenCanvas(frame.codedWidth, frame.codedHeight);
    const ctx = canvas.getContext("2d")!;

    canvas.width = frame.codedWidth || frame.displayWidth;
    canvas.height = frame.codedHeight || frame.displayHeight;

    ctx.drawImage(drawFrame, 0, 0);

    drawFrame.close()

    return await canvas.convertToBlob({ type: "image/png" });
}

export async function downloadBlob(frame: Blob | undefined) {
    if (!frame) return;

    const url = URL.createObjectURL(frame);

    const a = document.createElement("a");
    a.href = url;
    a.download = 'test-frame.png';
    a.click();

    URL.revokeObjectURL(url);
}
