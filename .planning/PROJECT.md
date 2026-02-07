# WebDashy

## What This Is

An open-source Progressive Web App that turns any smartphone into a dashcam. Continuous loop recording with accelerometer-based incident detection and on-demand clip saving — runs entirely in the browser with no backend, no app store, no subscriptions. Privacy-first: all data stays on device.

## Core Value

Reliably capture and save driving footage when it matters — continuous recording that doesn't crash, and clip saving that never loses the moment.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Continuous video recording with circular buffer (last 2 hours of footage)
- [ ] 30-60 second video chunks stored in IndexedDB with automatic oldest-chunk deletion
- [ ] VP9 primary codec with H.264 fallback (auto-detect device capabilities)
- [ ] Configurable video quality (low/medium/high)
- [ ] Manual save button — large, accessible, usable while driving
- [ ] Accelerometer-based auto-save on sudden braking/collision
- [ ] Saved clips are permanent (excluded from buffer deletion) with configurable duration (30s-2min around trigger)
- [ ] IndexedDB with two stores: `buffer` (rolling) and `saved` (permanent)
- [ ] Storage statistics dashboard (GB used, clip count, buffer duration)
- [ ] Auto-delete oldest saved clips with clear warning UI
- [ ] Clip review interface (list, preview, delete, export)
- [ ] Download clips to device storage and share via native share sheet
- [ ] Filename format: `dashcam_YYYY-MM-DD_HH-MM-SS.webm`
- [ ] Screen Wake Lock API to prevent sleep during recording
- [ ] PWA manifest, service worker, installable from browser
- [ ] Settings panel: video quality, buffer duration (1-4 hours), accelerometer sensitivity, storage limit
- [ ] Recording status indicator (REC icon, timer)
- [ ] Battery status indicator with warning if unplugged
- [ ] Landscape-default orientation with portrait allowed

### Out of Scope

- Real-time object detection — too CPU/battery intensive for continuous use
- Live streaming — not the use case, adds complexity
- Social sharing features — this is a utility tool, not a social platform
- Video editing capabilities — export raw footage, edit elsewhere
- ADAS features (lane departure, collision warning) — requires ML, out of scope for browser app
- Desktop browser support — not the use case
- Native app wrappers — PWA first, consider later
- GPS/speed metadata overlay — deferred to Phase 2
- Cloud backup / user accounts — deferred to future milestone
- Multi-camera support — deferred to future
- Voice command trigger — deferred to future
- Parking mode — deferred to future

## Context

- **Target platform:** Android Chrome 90+ as Tier 1; Samsung Internet 14+ Tier 1; iOS Safari 14+ best-effort (aggressive background throttling, poor PWA support)
- **Usage assumption:** Phone mounted in car, always charging during recording sessions
- **Architecture principle:** Heavy lifting in vanilla TypeScript services, React is UI layer only. No video blobs in React state.
- **Service layer:** ClipStorage, RecordingEngine, BufferManager, AccelerometerMonitor — all vanilla TS
- **Hooks layer:** useCamera, useRecorder, useStorage, useAccelerometer, useWakeLock — thin React wrappers
- **Storage reality:** Browser storage quotas vary wildly. Must query `navigator.storage.estimate()` on load and adapt buffer duration to available space.
- **iOS limitations:** Document clearly, don't chase parity. Android Chrome is the primary target.
- **Accelerometer tuning:** Combine acceleration threshold with jerk detection to reduce false positives. User-adjustable sensitivity slider. Manual save remains primary method.
- **Deployment:** GitHub repo with demo on Netlify/Vercel. No official hosted version initially — users self-deploy.

## Constraints

- **Tech stack**: React 18+ / TypeScript / Vite / Zustand — per user decision
- **Storage**: IndexedDB via `idb` library — browser storage only, no server
- **PWA tooling**: vite-plugin-pwa + Workbox for service worker and caching
- **Privacy**: Zero network requests for user data. Everything client-side.
- **License**: Apache 2.0
- **Browser minimum**: Chrome/Edge 90+, must support MediaRecorder, IndexedDB, DeviceMotionEvent
- **Performance**: Must record continuously 2+ hours without crash on mid-range Android devices

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| VP9 primary, H.264 fallback | Better compression for limited storage; fallback handles older devices | — Pending |
| Landscape default, portrait allowed | Traditional dashcam view preferred but don't lock users out | — Pending |
| Configurable clip duration (30s-2min) | Users have different needs; fixed 60s too opinionated | — Pending |
| Apache 2.0 license | MIT-like adoption with patent protection | — Pending |
| React + Zustand (not Redux) | Lightweight state management for relatively simple UI state | — Pending |
| Services in vanilla TS, not React | Video processing must not be coupled to React lifecycle | — Pending |
| IndexedDB via `idb` wrapper | Raw IndexedDB API is painful; `idb` is tiny and well-maintained | — Pending |
| No backend for v1 | Privacy-first, reduce complexity, ship faster | — Pending |

---
*Last updated: 2026-02-07 after initialization*
