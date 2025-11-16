import { createContext, ParentComponent, useContext, children, createSignal, createMemo, Accessor } from 'solid-js';
import { UserMediaState } from './data-models/device';
import { CameraAccess, CameraAccessState } from './components/camera-access';

type VideoConstraints = Omit<MediaTrackConstraintSet, 'deviceId' | 'groupId' | 'echoCancellation'>
type AudioConstraints = Omit<MediaTrackConstraintSet, 'deviceId' | 'groupId' | 'displaySurface' | 'facingMode'>
export type MediaConstraints = Omit<MediaStreamConstraints, 'video' | 'audio' | 'preferCurrentTab'> & {
  video?: VideoConstraints,
  audio?: false | AudioConstraints
};
type CameraContextProps = {
  constraints?: MediaConstraints,
  appName: string
}
type CameraContext = {
  requestPermission(): Promise<UserMediaState>
  canRequest: Accessor<boolean>
  faulted:  Accessor<boolean>,
  state: Accessor<UserMediaState>
};

const defaultConstraints: MediaStreamConstraints = {
  audio: true,
  video: {
    facingMode: 'environment'
  }
}

const cameraContext = createContext<CameraContext>({
  requestPermission: () => Promise.reject<UserMediaState>(new Error("Not initialized")),
  canRequest: () => false,
  faulted: () => false,
  state: (): UserMediaState => ({ permission: 'unknown', camera: undefined, devices: undefined })
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

export const CameraContextProvider: ParentComponent<CameraContextProps> = (props) => {

  const constraints = props.constraints || defaultConstraints;

  if (!checkBrowserSupport()) return <FaultyContext children={props.children} ctx={faultyContext()} />

  const [mediaState, setState] = createSignal<CameraAccessState>();
  const testIllustration = createMemo(() => {

    const permission = mediaState()?.state().permission
    if (permission === undefined) return "initializing";
    return permission
  }, [mediaState])

  const faulted = createMemo(() => {
    const permission = mediaState()?.state().permission
    if (!permission) return false;
    if (permission.startsWith('denied')) return true;
    // Error inuse is not considered a faulty state, a user can try again 
    if (permission === 'error:nosupport') return true;
    if (permission === 'error') return true;
    return false;
  }, [mediaState])

  const canRequest = createMemo(() => {
    const permission = mediaState()?.state().permission
    if (!permission) return false;
    if (permission === 'pending') return false;
    if (permission === 'granted') return false;
    if (faulted()) return false;
    return true;
  }, [mediaState, faulted])

  function requestPermission() {
    if (!mediaState()) return Promise.reject<UserMediaState>(new Error('Not yet initialized'))
    return mediaState()!.requestPermission();
  }

  const state = createMemo(() => mediaState()?.state() ?? cameraContext.defaultValue.state(), 
    [mediaState, () => mediaState()?.state()])

  return (
    <cameraContext.Provider value={{
      requestPermission, 
      canRequest, 
      faulted,
      state
    }}>
      <CameraAccess constraints={constraints} appName={props.appName} ref={setState} />
      {testIllustration()}
      {children(() => props.children)()}
    </cameraContext.Provider>
  );
}

export function useCamera() { return useContext(cameraContext); }