---
phase: quick
plan: 2
subsystem: camera-input
tags: [dev-tooling, testing, media-stream]
completed: 2026-02-16T21:34:41Z
duration: 93 seconds
tech-stack:
  added: []
  patterns: [captureStream, HEAD-request-check, dev-mode-detection]
key-files:
  created:
    - src/services/DevStream.ts
  modified:
    - src/hooks/useCamera.ts
    - src/services/CodecDetector.ts
    - .gitignore
decisions: []
dependency-graph:
  requires: [useCamera, CodecDetector, Vite-dev-mode]
  provides: [dev-video-stream, test-video-capability]
  affects: [camera-initialization, codec-detection]
metrics:
  tasks-completed: 2
  commits: 2
  files-created: 1
  files-modified: 3
---

# Quick Task 2: Use a Video File Instead of Camera in Development Mode

**One-liner:** Dev mode video file streaming via captureStream() with automatic fallback to real camera

## Objective

Enable development and testing without a physical camera by loading a video file from public/ and converting it to a MediaStream via captureStream(). The entire recording pipeline works unchanged since it receives the same MediaStream interface.

## What Was Built

### DevStream Utility Service

Created `src/services/DevStream.ts` with a single export: `getMediaStream(constraints?)`.

**Behavior:**
- **Production builds:** Zero overhead - immediately delegates to `navigator.mediaDevices.getUserMedia(constraints)`
- **Dev mode:** Attempts to load video file from `/dev-camera.webm` or `/dev-camera.mp4`
  - Uses HEAD request to check file existence without downloading
  - Loads video file into `<video>` element (not in DOM)
  - Sets `loop=true`, `muted=true`, `playsInline=true`
  - Calls `video.captureStream()` to convert to MediaStream
  - Falls back to real getUserMedia if no file found or on error
- **Error handling:** Any error in dev path falls back to getUserMedia with console warning

**Type safety:** Uses type assertion `(video as HTMLVideoElement & { captureStream(): MediaStream })` since `captureStream()` is not in all TypeScript lib types.

### Integration

**useCamera.ts:**
- Imported `getMediaStream` from DevStream
- Replaced `navigator.mediaDevices.getUserMedia` call with `getMediaStream`
- Zero behavioral changes - still receives MediaStream, error handling identical

**CodecDetector.ts:**
- Imported `getMediaStream` from DevStream
- Replaced `navigator.mediaDevices.getUserMedia` call in `testRecordAndVerify` method
- Codec detection (record, stop, verify playback) works identically with either source

**RecordingEngine.ts:**
- NOT modified - its `handleTrackEnded()` method keeps direct `getUserMedia` call
- Rationale: Track recovery is only relevant with real hardware, and looped dev videos never trigger track-ended events

**.gitignore:**
- Added `public/dev-camera.*` pattern to prevent committing dev video files

## Verification Results

All verification criteria passed:

1. `npx tsc --noEmit` - Zero type errors
2. `getUserMedia` occurrences - Exactly 2 locations as expected:
   - `src/services/RecordingEngine.ts:286` (track recovery)
   - `src/services/DevStream.ts` (production + fallback paths)
3. `getMediaStream` imports - 3 locations:
   - `src/services/DevStream.ts` (definition)
   - `src/hooks/useCamera.ts` (camera initialization)
   - `src/services/CodecDetector.ts` (codec test recording)
4. `.gitignore` - Contains `public/dev-camera.*` pattern

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Status

All success criteria met:

- In dev mode: placing a video file at `public/dev-camera.mp4` or `public/dev-camera.webm` causes the app to use that file as the camera source
- In dev mode without a video file: app falls back to real camera with console log `[DevStream] No dev video found, using real camera`
- In production: always uses real camera, zero overhead from the dev path (immediate delegation)
- The entire recording pipeline (preview, recording, codec detection) works identically with either stream source

## Testing Notes

To test this feature:
1. Place a video file at `public/dev-camera.mp4` or `public/dev-camera.webm`
2. Run `npm run dev`
3. Check browser console for `[DevStream] Using dev video: /dev-camera.[mp4|webm]`
4. Camera preview should show the video file looping
5. Recording, clip saving, and codec detection should work identically

To test fallback:
1. Remove/rename dev video file
2. Run `npm run dev`
3. Check console for `[DevStream] No dev video found, using real camera`
4. Browser should prompt for camera permission as normal

## Impact

**Developer experience:** Eliminates need for physical camera during development. Enables faster testing cycles, easier debugging of recording pipeline, and consistent test conditions.

**Production:** Zero impact - dev path completely eliminated by Vite's `import.meta.env.DEV` constant folding during production builds.

**Architecture:** Maintains clean separation - RecordingEngine, BufferManager, and ClipStorage remain completely unaware of stream source. Only camera acquisition points (useCamera, CodecDetector) are aware of DevStream.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 36bc1f0 | Create DevStream utility with dev video file loading and fallback |
| 2 | 2321b45 | Wire DevStream into useCamera and CodecDetector |

## Self-Check: PASSED

**Created files verification:**
- src/services/DevStream.ts: FOUND

**Modified files verification:**
- src/hooks/useCamera.ts: FOUND
- src/services/CodecDetector.ts: FOUND
- .gitignore: FOUND

**Commits verification:**
- 36bc1f0: FOUND
- 2321b45: FOUND

**Functional verification:**
- TypeScript compilation: PASSED (no errors)
- getUserMedia usage: PASSED (only in RecordingEngine and DevStream)
- getMediaStream imports: PASSED (DevStream, useCamera, CodecDetector)
- .gitignore pattern: PASSED (public/dev-camera.* present)
