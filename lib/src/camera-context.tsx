import { createContext, ParentComponent, useContext, children, createSignal, createMemo, Accessor } from 'solid-js';
import type { MediaPermission, UserMediaState } from './data-models/device';
import { MediaAccessMarshal } from './components/media-access-marshal';
import { faultyMediaPermissions, idleMediaPermissions } from './constants';
import { MediaAccessManager } from './components/media-access-manager';
import { logModule } from './helpers/debug-helper';

logModule('camera-context', import.meta)

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
  stop(): Promise<void>
  hasPermission(...permissionsToCheck: MediaPermission[]): boolean;
  canRequest: Accessor<boolean>
  faulted: Accessor<boolean>,
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
  stop: () => Promise.reject<void>(new Error("Not initialized")),
  hasPermission: () => false,
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

  const [mediaState, setState] = createSignal<MediaAccessManager>();
  const testIllustration = createMemo(() => {

    const permission = mediaState()?.state().permission
    if (permission === undefined) return "initializing";
    return permission
  }, [mediaState])

  const faulted = createMemo(() => {
    const state = mediaState()?.state()
    return hasPermission(state, ...faultyMediaPermissions);
  }, [mediaState])

  const canRequest = createMemo(() => {
    const state = mediaState()?.state()
    return hasPermission(state, idleMediaPermissions);
  }, [mediaState, faulted])

  function requestPermission() {
    if (!mediaState()) return Promise.reject<UserMediaState>(new Error('Not yet initialized'))
    return mediaState()!.requestPermission();
  }
  function stop() {
    if (!mediaState()) return Promise.reject<void>(new Error('Not yet initialized'))
    return mediaState()!.stop();
  }

  const state = createMemo(() => mediaState()?.state() ?? cameraContext.defaultValue.state(),
    [mediaState, () => mediaState()?.state()])

  return (
    <cameraContext.Provider value={{
      requestPermission,
      stop,
      hasPermission: (permissionsToCheck) => hasPermission(mediaState()?.state, permissionsToCheck),
      canRequest,
      faulted,
      state
    }}>
      <MediaAccessMarshal constraints={constraints} appName={props.appName} ref={setState} />
      {testIllustration()}
      {children(() => props.children)()}
    </cameraContext.Provider>
  );
}

export function useCamera() { return useContext(cameraContext); }

export function hasPermission(state: Accessor<UserMediaState | undefined> | undefined | UserMediaState, ...permissionsToCheck: MediaPermission[]) {
  if (!state) return false;
  const stateValue = typeof state === 'function' ? state() : state
  
  return matchesPermission(stateValue?.permission, ...permissionsToCheck)
}
export function matchesPermission(permission: Accessor<MediaPermission | undefined> | undefined | MediaPermission, ...permissionsToCheck: MediaPermission[]) {
  if (!permission) return false;
  const permissionValue = typeof permission === 'function' ? permission() : permission
  
  if (!permissionValue) return false
  return permissionsToCheck.includes(permissionValue);
}