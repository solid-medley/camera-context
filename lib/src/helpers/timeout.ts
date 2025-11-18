export const forMilliseconds = (milliseconds: number, abortSignal: AbortSignal) => new Promise<void>(res => {
    function clear() {
        clearTimeout(timeout); 
        abortSignal.removeEventListener('abort', clear)
    }
    let timeout = setTimeout(() => { 
        clear();
        res();
    }, milliseconds);
    abortSignal.addEventListener('abort', clear, { once: true })
})