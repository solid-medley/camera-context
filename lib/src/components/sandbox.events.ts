
export function eventType<TData extends unknown = never>() {
    return undefined as unknown as TData
}
export function returnType<TData extends object>() {
    return true as unknown as TData
}
export function returnVoid() {
    return true as unknown as void
}
export  function returnNothing() {
    return undefined as void
}