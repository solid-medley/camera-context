
export type VideoConstraints = Omit<MediaTrackConstraintSet, 'deviceId' | 'groupId' | 'echoCancellation'>
export type AudioConstraints = Omit<MediaTrackConstraintSet, 'deviceId' | 'groupId' | 'displaySurface' | 'facingMode'>
export type MediaConstraints = Omit<MediaStreamConstraints, 'video' | 'audio' | 'preferCurrentTab'> & {
  video?: VideoConstraints,
  audio?: false | AudioConstraints
};