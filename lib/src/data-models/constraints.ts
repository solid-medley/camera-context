
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