import type { Accessor, Component } from "solid-js"

type CameraManagerProps = {
  constraints: MediaStreamConstraints
  test: Accessor<boolean | undefined>
}
export const CameraManager: Component<CameraManagerProps> = (props) => {

  return <>
    <button onClick={() => navigator.mediaDevices.getUserMedia(props.constraints)}>Request</button>
    <button id="test2" onClick={() => { window.location.reload() }} >Reload</button>
    <pre>{formatStateInfo(props.constraints, props.test, import.meta.env.DEV)}</pre>
  </>
}

function formatStateInfo(constraints: MediaStreamConstraints, test: Accessor<boolean | undefined>, format: boolean): string {
  if (!format) return JSON.stringify({ constraints })
  return JSON.stringify({ constraints, test: test() }, null, 2)
}

export default CameraManager