import { InternalMediaConstraints } from '../data-models/constraints';
import { getMediaDeviceList, requestMediaPermission, storeCameraId } from '../helpers/media-helper'
import { sandboxModule } from "./sandbox.module";

// These imports need to be await import for the bundler
const { registerChildHandlers, forwardEvent, sendCallback } = await import("./sandbox.helpers");
const { logModule }  = await import('../helpers/debug-helper');
const { closeMediaStream } = await import("../helpers/stream-helper");
const { matchesPermission } = await import("../data-models/device");

logModule('media-access-manager', import.meta)

export type MediaAccessManagerConfig = {
    appName: string
}

export type MediaAccessManagerProps =
    & {
        [Key in keyof MediaAccessManagerConfig]: MediaAccessManagerConfig[Key]
    }
    & {
        /** 
         * Because a stream isn't StructureCloneable we just post it back to the parent window. 
         * 
         * The whole postmessage system is just so the IFrame owns the camera access, we can just pass the stream like this. \
         * And so, we will.
         */
        postStream(stream: MediaStream | undefined): void
    }

export default sandboxModule<MediaAccessManagerProps>(import.meta, async ({ 
    parent, abortSignal, appName, 
    postStream 
}) => {

    registerChildHandlers(parent, abortSignal, async (event) => {
        await forwardEvent(event, 'requestPermission', requestPermission)
        await forwardEvent(event, 'stopStream', stopStream)
    })

    let mediaStream: MediaStream | undefined = undefined;
    async function requestPermission(constraints: InternalMediaConstraints) {
       
        const realConstraints = await formatConstraints(constraints)
        const userMediaResult = await requestPermissionInternal(realConstraints);

        if (matchesPermission(userMediaResult.permission, 'granted', 'error:inuse')) 
            storeCameraId(appName, constraints.video?.uid)

        await sendCallback(parent, 'requestPermission', userMediaResult)
    }
    
    async function formatConstraints(constraints: InternalMediaConstraints): Promise<MediaStreamConstraints> {
       
        if (typeof constraints.video === 'undefined') return constraints
        if (typeof constraints.video === 'boolean') return constraints

        // TODO if preferLas get from localStorage
        const uid = constraints.video.uid
        if (!uid) return constraints

        const devices = await getMediaDeviceList();
        if (typeof devices === 'string') {
            // As far as we know this never happens
            debugger;
            return constraints;
        }

        const realDevice = devices.videoInput.find(d => d.uid === uid)
        if (!realDevice) {
            // As far as we know this never happens
            debugger;
            return constraints;
        }
        const deviceConstraints = {...constraints};
        deviceConstraints.video = { deviceId: { exact: realDevice.deviceId} }

        return deviceConstraints
    }

    async function requestPermissionInternal(constraints: MediaStreamConstraints) {
        if (!!mediaStream) {
            await endStream();
        }

        const userMediaResult = await requestMediaPermission(constraints, appName)
        if (userMediaResult.stream) {

            mediaStream = userMediaResult.stream;
            postStream(userMediaResult.stream)

            return { ...userMediaResult, stream: undefined }
        }

        return userMediaResult
    }

    async function stopStream() {

        await endStream();
        await sendCallback(parent, 'stopStream', void 0);
    }

    async function endStream() {

        if (!mediaStream) return;
        postStream(undefined);
        await closeMediaStream(mediaStream)
        mediaStream = undefined;
    }
});
