import { Component, createMemo, JSX } from 'solid-js';
import { useCamera } from '../camera-context';

import controlStyle from "./media-context.controls.css"
import style from "./selector.css"

type OnChangeEvent = Parameters<JSX.ChangeEventHandler<HTMLSelectElement, Event>>[0]
type SelectorElementProps = Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'value'>;
export type SelectorProps = SelectorElementProps
export const VideoDeviceSelector: Component<SelectorProps> = (props) => {

    const { mediaDevices, active, stream, camera, changeVideoInput, configuration } = useCamera();
    const { ...elementProps } = props;

    // TODO Label
    const selectorAriaLabel = 'Video input device selector';
    const selectorLabelText = createMemo(() => {
        // TODO label
        if (active()) return "Select video input device"
        return "Video input not active"

    }, [active]);

    const disabled = createMemo(() => {
        if (props.disabled) return true;
        if (!active()) return true;
        const devices = mediaDevices();
        if (devices == 'not-available') return true;
        if (devices == 'not-enumerated') return true;
        if (!devices.videoInput) return true;
        return false
    }, [mediaDevices, active])

    const deviceId = createMemo(() => {
        return camera()?.uid ?? 0;
    }, [camera()])

    const options = createMemo(() => {
        const devices = mediaDevices();
        if (devices == 'not-available') return <option value={0} label={configuration.noDevicesText} selected />;
        if (devices == 'not-enumerated') return <option value={0} label={configuration.noDevicesText} selected />;
        if (!devices.videoInput.length) return <option value={0} label={configuration.noDevicesText} selected />;
        if (!stream()) return <option value={0} label={configuration.noDevicesText} selected />;

        return devices.videoInput.map(device => {
            const selected = deviceId() === device.uid;
            return <option value={device.uid} selected={selected} label={device.label} />
        })
    }, [mediaDevices, deviceId, disabled])

    async function onChange(e: OnChangeEvent) {
        if (e.target.value === '0') return
        if (e.target.value === deviceId()) return
        const selectedValue = e.target.value

        await changeVideoInput(selectedValue)
    }

    const selector = createMemo(
        () => <select {...elementProps} 
            name={elementProps.name ?? 'camera'} 
            disabled={disabled()} 
            value={deviceId()}
            onChange={onChange}
        >
            {options()}
        </select>,
        [options, disabled, deviceId]
    )

    return <>
        {/* Temp solution for TSUP issue, fix with vite lib */}
        <style innerHTML={controlStyle} />
        <style innerHTML={style} />
        <label
            class='media-context device-selector'
            title={selectorLabelText()}
            aria-label={`${selectorAriaLabel}: ${selectorLabelText()}`}
        >
            {selector()}

            <span aria-roledescription="input-label">
                {selectorLabelText()}
            </span>
        </label>
    </>
}