# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start Vite dev server with HMR
pnpm build      # Type-check + production build
pnpm lint       # Biome lint check
pnpm format     # Biome format
pnpm check      # Biome lint with auto-fix
pnpm preview    # Preview production build
```

No test suite is configured.

## Styling

- Use **Tailwind CSS v4** with inline utility classes — no custom CSS files or class-based stylesheets
- Custom animations are defined in `src/index.css` via `@theme` and `@keyframes`
- Never create `.css` files for component styles — all styling goes in `className` props
- Theme tokens: `--color-rec` (red), `--color-hud` (cyan), `--color-warn` (yellow)
- Fonts: `Chakra Petch` (display), `Share Tech Mono` (monospace)

## Architecture

This is a dashcam/vehicle-detection web app. The core principle is **blobs never enter React** — video and image data lives exclusively in IndexedDB, keeping React state memory-safe.

### Layer separation

| Layer | Location | Responsibility |
|---|---|---|
| Services | `src/services/` | Pure business logic, no React |
| Hooks | `src/hooks/` | React integration layer, wires services → Zustand |
| Store | `src/store/appStore.ts` | UI state only (Zustand) |
| Components | `src/components/` | Rendering only, read from store |

### State management

Zustand (`appStore.ts`) holds UI-only state: recording status, camera errors, storage stats, battery, detection toggles, crop/zoom, plate captures, settings. Fields persisted to localStorage: `cropTop`, `cropBottom`, `plateCaptureEnabled`, `plateSettings`. **Video blobs never enter this store.**

### Key services

- **RecordingEngine** — MediaRecorder lifecycle, circuit-breaker hourly restart, track watchdog (5s), visibility handling (pauses after 10s background)
- **BufferManager** — Circular 30s chunk buffer stored in IndexedDB
- **ClipStorage** — IndexedDB wrapper (4 stores: `buffer`, `saved`, `session`, `plates`)
- **ObjectDetector** — MediaPipe EfficientDet-Lite2 model inference
- **PlateReader** — Tesseract.js OCR pipeline with queue cap of 3
- **VehicleTracker** — IoU-based vehicle tracking across frames

### Key hooks

- **useRecorder** — Wires RecordingEngine events to Zustand; detects interrupted sessions (>2 min gap)
- **useDetection** — RAF detection loop with back-pressure (skips frame if inference still running)
- **usePlateCapture** — Coordinates VehicleTracker → PlateReader → IndexedDB persistence
- **useCamera** — Camera permission + zoom capability detection
- **useStorage** — Storage estimate polling
- **useBattery** — Battery API monitoring

### Data flow

```
Camera → MediaRecorder → BufferManager → IndexedDB
Camera frame → ObjectDetector → VehicleTracker → PlateReader → IndexedDB
Metadata only → Zustand store → Components
```

### Session recovery

`ClipStorage` persists a `SessionState` (codec + quality + last chunk timestamp) to detect crashes. On mount, `useRecorder` checks for an interrupted session (gap > 2 min) and surfaces it to the user.

## Tooling

- **Biome** for lint + format (100 char line width, single quotes, trailing commas)
- **Vite 7** with `@vitejs/plugin-react` and `@tailwindcss/vite`
- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters` enabled)
