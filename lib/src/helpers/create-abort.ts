import { onCleanup, onMount } from "solid-js";

export function createAbortSignal(): [abortSignal: AbortSignal, abortController: AbortController] {

    let abortController = new AbortController();

    onMount(() => {
        if (abortController.signal.aborted) 
            abortController = new AbortController();
    });
    onCleanup(() => {
        if (abortController.signal.aborted) return;
        try {
            //abortController.abort('onCleanup')
        } finally {
            //
        }
    });

    return [abortController.signal, abortController]
}