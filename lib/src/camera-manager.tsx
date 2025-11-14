import type { Accessor, Component } from 'solid-js';

type CameraManagerProps = {
  constraints: MediaStreamConstraints
  test: Accessor<boolean | undefined>
}
export const CameraManager: Component<CameraManagerProps> = (props) => {
  return <pre>{formatStateInfo(props.constraints, props.test, import.meta.env.DEV)}</pre>
}

function formatStateInfo(constraints: MediaStreamConstraints, test: Accessor<boolean | undefined>, format: boolean): string {
  if (!format) return JSON.stringify({ constraints })
  return JSON.stringify({ constraints, test: test() }, null, 2)
}