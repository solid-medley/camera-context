
export type VideoConstraints = Omit<MediaTrackConstraintSet, 'deviceId' | 'groupId' | 'echoCancellation'>
export type AudioConstraints = Omit<MediaTrackConstraintSet, 'deviceId' | 'groupId' | 'displaySurface' | 'facingMode'>
type SelectedMediaConstraints = {
  video: VideoConstraints,
  audio?: boolean | AudioConstraints
} |  {
  video?: boolean | VideoConstraints,
  audio: AudioConstraints
};
export type MediaConstraints = Omit<MediaStreamConstraints, 'video' | 'audio' | 'preferCurrentTab'> & SelectedMediaConstraints
export type InternalMediaConstraints = Omit<MediaStreamConstraints, 'video' | 'audio'> & {
  audio?: MediaStreamConstraints['audio'] & { usePrevious?:boolean, uid?: string }
  video?: MediaStreamConstraints['video'] & { usePrevious?:boolean, uid?: string }
}