import { MediaPermissionsError } from "mic-check";
import { features } from "../constants";

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

/** Module to help identifying modules in chunks */
export function logModule(moduleName: string, importMeta: ImportMeta) {
    if (!features.DEBUG_LOG_MODULE_ENABLED) return;
    console.debug(moduleName, importMeta.url.split('/').at(-1))
    console.debug(importMeta.url)
}

/** Stupid helper for debugging purposes */
export function errorToString(err: Error | string | MediaPermissionsError, constraints?: MediaStreamConstraints) {
    if (typeof err == 'string') return err;

    let name = err.name;
    name = name === undefined ? "Error" : `${name}`;
    let msg = err.message;
    msg = msg === undefined ? "" : `${msg}`;

    if ('type' in err) name += '|' + err.type
    const cc = constraints === undefined ? "" : "\n========================================\n" + JSON.stringify(constraints)
    return `[${name}]: ${msg}` + '\n' + JSON.stringify(err, undefined, 2) + cc;
};