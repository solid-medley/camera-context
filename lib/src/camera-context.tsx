import { createContext, ParentComponent, useContext, children, createSignal, createMemo } from 'solid-js';
import { CameraAccess, CameraAccessState, CameraPermission } from './components/camera-access';

type VideoConstraints = Omit<MediaTrackConstraintSet, 'deviceId' | 'groupId' | 'echoCancellation'>
type AudioConstraints = Omit<MediaTrackConstraintSet, 'deviceId' | 'groupId' | 'displaySurface' | 'facingMode'>
export type MediaConstraints = Omit<MediaStreamConstraints, 'video' | 'audio' | 'preferCurrentTab'> & {
  video?: VideoConstraints,
  audio?: false | AudioConstraints
};
type MediaPermissionProps = {
  constraints?: MediaConstraints,
}
type CameraContext = {
  requestPermission(): Promise<CameraPermission>
};

const defaultConstraints: MediaStreamConstraints = {
  audio: true,
  video: {
    facingMode: 'environment'
  }
}

const cameraContext = createContext<CameraContext>({
  requestPermission: () => Promise.reject<'unknown'>(new Error("Not initialized"))
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

  const constraints = props.constraints || defaultConstraints;

  if (!checkBrowserSupport()) return <FaultyContext children={props.children} ctx={faultyContext()} />


  const [state, setState] = createSignal<CameraAccessState>();
  const testIllustration = createMemo(() => {

    const currentState = state();
    if (currentState === undefined) return "initializing";
    return currentState.permission();
  }, state)

  
  function requestPermission() {
    if (!state()) return Promise.reject<CameraPermission>(new Error('Not yet initialized'))
    return state()!.requestPermission();
  }

  return (
    <cameraContext.Provider value={{
      requestPermission
    }}>
      <CameraAccess constraints={constraints} ref={setState} />
      {testIllustration()}
      {children(() => props.children)()}
    </cameraContext.Provider>
  );
}

export function useCamera() { return useContext(cameraContext); }