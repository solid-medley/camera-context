import { Accessor, Component, createMemo } from "solid-js";
import { MediaConstraints } from '../data-models/constraints';
import { defaultConstraints, useCamera } from "../camera-context";

import cameraStartIcon from './icons/video.svg'
import miStartIcon from './icons/microphone.svg'
import cameraStopIcon from './icons/video-slash.svg'
import micStopIcon from './icons/microphone-slash.svg'

import style from "./start-stop.css"

export type StartStopIconButtonProps = {
    constraints?: MediaConstraints | undefined
}
export type StartStopButtonProps = StartStopIconButtonProps & {
    CameraStartIcon: Component,
    MicStartIcon: Component,
    CameraStopIcon: Component,
    MicStopIcon: Component,
}

export const StartStopIconButton: Component<StartStopIconButtonProps> = ({ constraints }) => {
    return <StartStopIconButtonBase
        constraints={constraints}
        CameraStartIcon={() => <span aria-roledescription="icon" innerHTML={cameraStartIcon} />}
        MicStartIcon={() => <span aria-roledescription="icon" innerHTML={miStartIcon} />}
        CameraStopIcon={() => <span aria-roledescription="icon" innerHTML={cameraStopIcon} />}
        MicStopIcon={() => <span aria-roledescription="icon" innerHTML={micStopIcon} />}
    />
}


export const StartStopIconButtonBase: Component<StartStopButtonProps> = ({
    constraints,
    CameraStartIcon,
    MicStartIcon,
    CameraStopIcon,
    MicStopIcon
}) => {

    const { active, idle, requestPermission, stopStreaming } = useCamera();

    const startStopText = createMemo(() => {
        // TODO label
        if (active()) return "stop"
        return "start"

    }, [active]);
    const startStopAriaLabel = createMemo(() => {
        // TODO label
        if (active()) "Stop recording"
        return "Start recording"

    }, [active]);

    async function onClick() {

        if (active()) {
            await stopStreaming()
            return;
        }

        await requestPermission(constraints);
    }

    return <>
        {/* Temp solution for TSUP issue, fix with vie lib */}
        <style innerHTML={style} />
        <button
            class='media-context start-stop-icon-button'
            onClick={onClick}
            disabled={!idle() && !active()}
            title={startStopAriaLabel()}
            aria-label={startStopAriaLabel()}
        >
            <StartStopIcon
                constraints={constraints} active={active}
                CameraStartIcon={CameraStartIcon} MicStartIcon={MicStartIcon}
                CameraStopIcon={CameraStopIcon} MicStopIcon={MicStopIcon}
            />
            <span aria-roledescription="label">
                {startStopText()}
            </span>
        </button>
    </>

}
const StartStopIcon: Component<StartStopButtonProps & { active: Accessor<boolean> }> = ({
    constraints,
    active,
    CameraStartIcon,
    MicStartIcon,
    CameraStopIcon,
    MicStopIcon
}) => {

    const safeConstraints = constraints ?? defaultConstraints

    const startIcon = createMemo(() => {
        if (safeConstraints.video && safeConstraints.audio)
            return <>
                <CameraStartIcon />
                <MicStartIcon />
            </>

        if (safeConstraints.video)
            return <CameraStartIcon />

        return <MicStartIcon />

    }, [constraints])
    const stopIcon = createMemo(() => {
        if (safeConstraints.video && safeConstraints.audio)
            return <>
                <CameraStopIcon />
                <MicStopIcon />
            </>

        if (safeConstraints.video)
            return <CameraStopIcon />

        return <MicStopIcon />

    }, [constraints])

    const startStopIcon = createMemo(() => {

        if (active()) return stopIcon()
        return startIcon()

    }, [startIcon, stopIcon, active])

    return <>{startStopIcon()}</>
}


