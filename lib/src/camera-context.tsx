import { createContext, ParentComponent, useContext, children, createSignal } from 'solid-js';
import { CameraManager } from './camera-manager';
import { ComponentFrame } from './components/component-frame';

type VideoConstraints = Omit<MediaTrackConstraintSet, 'deviceId' | 'groupId' | 'echoCancellation'>
type AudioConstraints = Omit<MediaTrackConstraintSet, 'deviceId' | 'groupId' | 'displaySurface' | 'facingMode'>
type MediaConstraints = Omit<MediaStreamConstraints, 'video' | 'audio' | 'preferCurrentTab'> & {
  video?: VideoConstraints,
  audio?: false | AudioConstraints
};
type MediaPermissionProps = {
  constraints?: MediaConstraints,
}
type CameraContext = {
  requestPermission(): Promise<void>
};

const defaultConstraints: MediaStreamConstraints = {
  audio: true,
  video: {
    facingMode: 'environment'
  }
}

const cameraContext = createContext<CameraContext>({
  requestPermission: () => Promise.reject<void>(new Error("Not initialized"))
})

export const FaultyContext: ParentComponent<{ ctx: CameraContext }> = (props) => {
  return <cameraContext.Provider value={props.ctx}>
    {children(() => props.children)()}
  </cameraContext.Provider>
}

function faultyContext(): CameraContext { return cameraContext.defaultValue }
function checkBrowserSupport() {
  if (typeof navigator === undefined) return false
  if (!('mediaDevices' in navigator)) return false
  if (!('getUserMedia' in navigator.mediaDevices)) return false

  return true;
}

export const CameraContextProvider: ParentComponent<MediaPermissionProps> = (props) => {

  const [test, setTest] = createSignal<boolean>();
  const constraints = props.constraints || defaultConstraints;

  if (!checkBrowserSupport()) return <FaultyContext children={props.children} ctx={faultyContext()} />

  function requestPermission() {
    setTest(true)
    return Promise.resolve<void>(undefined)
  }

  return (
    <cameraContext.Provider value={{
      requestPermission
    }}>
      <ComponentFrame 
        name='camera-context'
        allow={formatPermissions(constraints)}
        sandbox="allow-same-origin allow-scripts"
      >
        <CameraManager constraints={constraints} test={test} />
      </ComponentFrame>
      {children(() => props.children)()}
    </cameraContext.Provider>
  );
}

export function useCamera() { return useContext(cameraContext); }




function formatPermissions(constraints: MediaStreamConstraints): string | undefined {
  const allowAudio = constraints ? !!constraints.audio : true
  if (!allowAudio) return "camera 'src'"
  return "camera 'src'; microphone 'src'"
}

