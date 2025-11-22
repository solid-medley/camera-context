import { createContext, ParentComponent, useContext, children, createSignal, createMemo, Accessor } from 'solid-js';
import type { Camera, MediaPermission, UserMediaState } from './data-models/device';
import { MediaAccessMarshal } from './components/media-access-marshal';
import { faultyMediaPermissions, idleMediaPermissions } from './constants';
import { MediaAccessManager } from './components/media-access-manager';
import { logModule } from './helpers/debug-helper';
import { MediaConstraints } from './data-models/constraints';

logModule('camera-context', import.meta)

type CameraContextProps = {
  appName: string
}
type CameraContext = {
  requestPermission(constraints?: MediaConstraints): Promise<UserMediaState>
  stopStreaming(): Promise<void>
  
  permission: Accessor<MediaPermission | undefined>
  has(...permissionsToCheck: MediaPermission[]): boolean;
  active: Accessor<boolean>
  idle: Accessor<boolean>
  faulted: Accessor<boolean>,

  camera: Accessor<Camera | undefined>
  stream: Accessor<MediaStream | undefined>
};

const defaultConstraints: MediaStreamConstraints = {
  audio: true,
  video: {
    facingMode: 'environment'
  }
}

const cameraContext = createContext<CameraContext>({
  requestPermission: () => Promise.reject<UserMediaState>(new Error("Not initialized")),
  stopStreaming: () => Promise.reject<void>(new Error("Not initialized")),
  
  permission: (): MediaPermission => 'unknown',
  has: () => false,
  active: () => false,
  idle: () => false,
  faulted: () => false,
  
  camera: (): Camera | undefined => undefined,
  stream: (): MediaStream | undefined => undefined
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

  if (!checkBrowserSupport()) return <FaultyContext children={undefined} ctx={faultyContext()} />

  const [mediaState, setState] = createSignal<MediaAccessManager>();
  
  const state = createMemo(() => {
    return mediaState()?.state()
  }, [mediaState])

  const permission = createMemo(() => {
    return state()?.permission
  }, [state])
  

  const camera = createMemo(
    () => state()?.camera,
    [state]
  )
  const stream = createMemo(
    () => state()?.stream,
    [state, () => {
      console.log('check')
      return true
    }]
  )
  
  const testIllustration = createMemo(() => {

    const permission = mediaState()?.state().permission
    if (permission === undefined) return "initializing";
    return permission
  }, [mediaState])

  const faulted = createMemo(() => {
    return matchesPermission(permission(), ...faultyMediaPermissions);
  }, [permission])

  const idle = createMemo(() => {
    return matchesPermission(permission(), idleMediaPermissions);
  }, [permission])

  const active = createMemo(() => {
    return matchesPermission(permission(), 'granted') && !!stream();
  }, [permission, stream])

  function requestPermission(constraints?: MediaConstraints) {
    if (!mediaState()) return Promise.reject<UserMediaState>(new Error('Not yet initialized'))
    return mediaState()!.requestPermission(constraints ?? defaultConstraints);
  }
  function stopStreaming() {
    if (!mediaState()) return Promise.reject<void>(new Error('Not yet initialized'))
    return mediaState()!.stopStreaming();
  }

  return (
    <cameraContext.Provider value={{
      requestPermission,
      stopStreaming,

      permission: permission,
      has: (...p) => hasPermission(state(), ...p),
      idle,
      active,
      faulted,

      camera,
      stream
    }}>
      <MediaAccessMarshal appName={props.appName} ref={setState} />
      {testIllustration()}
      {children(() => props.children)()}
    </cameraContext.Provider>
  );
}

export function useCamera() { 
  return useContext(cameraContext); 
}

export function hasPermission(state: undefined | UserMediaState, ...permissionsToCheck: MediaPermission[]) {
  if (!state) return false;
  
  return matchesPermission(state.permission, ...permissionsToCheck)
}
export function matchesPermission(permission: undefined | MediaPermission, ...permissionsToCheck: MediaPermission[]) {
  if (!permission) return false;
  
  if (!permission) return false
  return permissionsToCheck.includes(permission);
}