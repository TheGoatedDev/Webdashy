/**
 * Augment MediaTrack types with Image Capture API properties.
 * The `zoom` property is part of the W3C Image Capture spec
 * but missing from TypeScript's built-in DOM lib types.
 */

interface MediaTrackCapabilities {
  zoom?: {
    min: number;
    max: number;
    step: number;
  };
}

interface MediaTrackConstraintSet {
  zoom?: ConstrainDouble;
}
