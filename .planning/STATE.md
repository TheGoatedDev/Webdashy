# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Reliably capture and save driving footage when it matters — continuous recording that doesn't crash, and clip saving that never loses the moment.
**Current focus:** Phase 1 - Core Recording Engine

## Current Position

Phase: 1 of 5 (Core Recording Engine)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-02-17 - Completed quick task 6: Switch to YOLOv8n ONNX with configurable vertical crop region

Progress: [██░░░░░░░░] 67%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 3 min
- Total execution time: 0.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 2 | 6 min | 3 min |

**Recent Trend:**
- Last 5 plans: 3min, 3min
- Trend: Consistent velocity

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Architecture: Heavy vanilla TypeScript services, React is UI layer only (video blobs never enter React state)
- Storage: IndexedDB via idb library with two stores (buffer for rolling, saved for permanent)
- Codec: VP9 primary with H.264 fallback, determined by runtime test-record-verify on first launch
- TypeScript verbatimModuleSyntax requires 'type' keyword for type-only imports (01-01)
- Storage quota warnings at 80/90/95% thresholds to prevent silent failures (01-01)
- Adaptive buffer duration adjusts from 30min to 2 hours based on available space (01-01)
- 30-second timeslice balances storage frequency vs overhead (01-02)
- Track watchdog runs every 5s to detect camera disconnection (01-02)
- Circuit breaker restarts MediaRecorder every 60min to prevent memory leaks (01-02)
- Background timeout: stop recording if app hidden for 10+ seconds (01-02)
- Session state persisted after every chunk for crash recovery (01-02)
- ONNX detection uses webgl/wasm providers (not webgpu) to avoid COOP/COEP header requirements (quick-5)
- YOLOv8n letterboxes video to 640x640 with gray (114,114,114) padding; bbox output mapped back to pixel coords (quick-5)
- Crop region stored as cropTop/cropBottom percentages (0-100); postprocess adds cropOffsetY to Y before returning full-frame coords (quick-6)
- rAF loop + busyRef prevents inference stacking; store accessed via getState() in loop to avoid re-render cascade (quick-6)
- 10% minimum gap enforced between cropTop and cropBottom sliders in CropRegionControl (quick-6)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Migrate ESLint to Biome | 2026-02-16 | b7d14d4 | [1-migrate-eslint-to-biome](./quick/1-migrate-eslint-to-biome/) |
| 2 | Use a video file instead of camera in dev mode | 2026-02-16 | 2321b45 | [2-use-a-video-file-instead-of-camera-in-de](./quick/2-use-a-video-file-instead-of-camera-in-de/) |
| 3 | Make video stream continue playing regardless of recording state | 2026-02-16 | 9451b3a | [3-make-video-stream-continue-playing-regar](./quick/3-make-video-stream-continue-playing-regar/) |
| 4 | Implement basic computer vision model for car and person detection | 2026-02-16 | b343f0a | [4-implement-basic-computer-vision-model-fo](./quick/4-implement-basic-computer-vision-model-fo/) |
| 5 | Migrate object detection from MediaPipe to YOLOv8n via ONNX Runtime Web | 2026-02-17 | 6f1416c | [5-migrate-object-detection-from-mediapipe-](./quick/5-migrate-object-detection-from-mediapipe-/) |
| 6 | Switch to YOLOv8n ONNX with configurable vertical crop region | 2026-02-17 | a678f86 | [6-switch-to-yolov8n-onnx-with-configurable](./quick/6-switch-to-yolov8n-onnx-with-configurable/) |

## Session Continuity

Last session: 2026-02-17T17:25:43Z
Stopped at: Completed quick task 6 (Switch to YOLOv8n ONNX with configurable vertical crop region)
Resume file: None
