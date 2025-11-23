import { createContext, ParentComponent, useContext, children, createSignal, createMemo, Accessor, onMount, createEffect, on } from 'solid-js';
import type { Camera, DeviceResult, MediaPermission, UserMediaState } from './data-models/device';
import { MediaAccess, MediaAccessMarshal } from './components/media-access-marshal';
import { defaultConfiguration, faultyMediaPermissions, idleMediaPermissions } from './constants';
import { logModule } from './helpers/debug-helper';
import { MediaConstraints } from './data-models/constraints';
import { getMediaDeviceList } from './helpers/media-helper';
import { createAbortSignal } from './helpers/create-abort';
import { getBrowserMetadata, type BrowserMetadata } from './helpers/browser-metadata';

// This needs to be a dynamic import for the bundler
const { hasPermission, matchesPermission } = await import('./data-models/device')

logModule('camera-context', import.meta)

export type MediaContextConfiguration = {
  noSignalText?: string | undefined,
  noDevicesText?: string
}
type CameraContextProps = {
  appName: string,
  configuration?: MediaContextConfiguration
}
type CameraContext = {
  requestPermission(constraints?: MediaConstraints): Promise<UserMediaState>
  stopStreaming(): Promise<void>
  changeVideoInput(deviceId: string): Promise<void>
  mediaDevices: Accessor<DeviceResult>,
  
  permission: Accessor<MediaPermission | undefined>
  has(...permissionsToCheck: MediaPermission[]): boolean;
  active: Accessor<boolean>
  idle: Accessor<boolean>
  faulted: Accessor<boolean>,

  camera: Accessor<Camera | undefined>
  stream: Accessor<MediaStream | undefined>

  configuration: MediaContextConfiguration,
  browser: BrowserMetadata
};

export const defaultConstraints: Readonly<MediaStreamConstraints> = Object.freeze({
  audio: true,
  video: {
    facingMode: 'environment'
  }
})

const cameraContext = createContext<CameraContext>({
  requestPermission: () => Promise.reject<UserMediaState>(new Error("Not initialized")),
  stopStreaming: () => Promise.reject<void>(new Error("Not initialized")),
  changeVideoInput: () => Promise.reject<void>(new Error("Not initialized")),
  mediaDevices: (): DeviceResult => 'not-enumerated',
  
  permission: (): MediaPermission => 'unknown',
  has: () => false,
  active: () => false,
  idle: () => false,
  faulted: () => false,
  
  camera: (): Camera | undefined => undefined,
  stream: (): MediaStream | undefined => undefined,

  configuration: defaultConfiguration,
  browser: getBrowserMetadata()
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

  const [mediaState, setState] = createSignal<MediaAccess>();
  
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
    [state]
  )

  /// TODO other component
  const [signal] = createAbortSignal();
  const [mediaDevices, setMediaDevices] = createSignal<DeviceResult>('not-enumerated');
  onMount(async () => {
    setMediaDevices(await getMediaDeviceList());
    if (mediaDevices() === 'not-available') return;

    addEventListener("devicechange", async () => { setMediaDevices(await getMediaDeviceList()); }, { signal })
  })
  
/** https://stackoverflow.com/a/78283918 */
  createEffect(on(permission, async () => {
    setMediaDevices(await getMediaDeviceList());
  }, { defer: true }))

  /// TEMP

  createEffect(() => {
    console.log('mediaDevices', mediaDevices())
  }, [mediaDevices])

  ///
  
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
    return matchesPermission(permission(), 'granted') && !!camera();
  }, [permission, camera])

  function requestPermission(constraints?: MediaConstraints) {
    if (!mediaState()) return Promise.reject<UserMediaState>(new Error('Not yet initialized'))
    return mediaState()!.requestPermission(constraints ?? defaultConstraints);
  }
  async function stopStreaming() {
    if (!mediaState()) return Promise.reject<void>(new Error('Not yet initialized'))
    return await mediaState()!.stopStreaming();
  }
  async function changeVideoInput(deviceId: string) {
    if (!mediaState()) return Promise.reject<void>(new Error('Not yet initialized'))
    return await mediaState()!.changeVideoInput(deviceId);
  }

  return (
    <cameraContext.Provider value={{
      requestPermission,
      stopStreaming,
      changeVideoInput,
      mediaDevices,

      permission: permission,
      has: (...p) => hasPermission(state(), ...p),
      idle,
      active,
      faulted,

      camera,
      stream,

      // TODO merge configuration
      configuration: !props.configuration 
        ? defaultConfiguration
        : { 
          ...defaultConfiguration, 
          noSignalText: Object.hasOwn(props.configuration, 'noSignalText')
            ? props.configuration.noSignalText
            : defaultConfiguration.noSignalText, 
          noDevicesText: props.configuration.noDevicesText
            ?? defaultConfiguration.noDevicesText
        },
      browser: getBrowserMetadata()
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
