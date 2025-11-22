import { onCleanup, onMount } from "solid-js";

export function createAbortSignal(): [abortSignal: AbortSignal, abortController: AbortController['abort']] {

    let abortController = new AbortController();

    onMount(() => {
        // Rebuild if hot reload happened
        if (import.meta.env.DEV && abortController.signal.aborted) 
            abortController = new AbortController();

        // Cancel on hot reload to prevent illegal invocations etc.
        if (import.meta.env.DEV && import.meta.hot) {
            import.meta.hot.on('vite:beforeUpdate', () => {
                try {
                    abort('vite:beforeUpdate')
                } finally{
                    //
                }
            });
        }

        // Cancel on navigating away
        document.addEventListener('close', () => {
            if (abortController.signal.aborted) return;
            abort('page:close')
        })
        window.addEventListener('beforeunload', () => {
            if (abortController.signal.aborted) return;
            abort('window:unload')
        })
    });
    // Cancel on unmounting
    onCleanup(() => {
        if (abortController.signal.aborted) return;
        try {
            if (abortController.signal.aborted) return;
            abort('onCleanup')
        } finally {
            //
        }
    });

    /** https://mtsknn.fi/blog/illegal-invocations-in-js/ */
    const abort = (function abort(reason?: string){
        abortController.abort.call(abortController, reason)
    }).bind(document)

    return [abortController.signal, abort.bind(document)]
}