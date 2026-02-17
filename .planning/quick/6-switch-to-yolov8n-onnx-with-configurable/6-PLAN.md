---
phase: quick-6
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - vite.config.ts
  - src/services/ObjectDetector.ts
  - src/hooks/useDetection.ts
  - src/store/appStore.ts
  - src/components/DetectionOverlay.tsx
  - src/components/CropRegionControl.tsx
  - src/App.tsx
autonomous: true
requirements: [quick-6]
must_haves:
  truths:
    - "Object detection uses YOLOv8n via ONNX Runtime Web (not MediaPipe)"
    - "User can adjust vertical crop region via UI controls"
    - "Detection only processes the cropped vertical band of the video frame"
    - "Bounding boxes are drawn at correct positions in the full video frame (accounting for crop offset)"
    - "Detection loop uses requestAnimationFrame with back-pressure (not setTimeout)"
  artifacts:
    - path: "src/services/ObjectDetector.ts"
      provides: "YOLOv8n ONNX inference with crop region support"
      contains: "onnxruntime-web"
    - path: "src/hooks/useDetection.ts"
      provides: "rAF-based detection loop with busyRef back-pressure"
      contains: "requestAnimationFrame"
    - path: "src/store/appStore.ts"
      provides: "cropTop and cropBottom state (0-100 percentages)"
      contains: "cropTop"
    - path: "src/components/CropRegionControl.tsx"
      provides: "UI for adjusting crop top/bottom percentages"
    - path: "src/components/DetectionOverlay.tsx"
      provides: "Canvas overlay that maps cropped-space detections to full-frame coordinates"
  key_links:
    - from: "src/hooks/useDetection.ts"
      to: "src/services/ObjectDetector.ts"
      via: "detect() call with cropTop/cropBottom params"
      pattern: "detector\\.detect"
    - from: "src/services/ObjectDetector.ts"
      to: "src/store/appStore.ts"
      via: "crop region passed as detect() arguments"
      pattern: "cropTop|cropBottom"
    - from: "src/components/DetectionOverlay.tsx"
      to: "src/store/appStore.ts"
      via: "reads cropTop to offset bounding box Y coordinates"
      pattern: "cropTop"
---

<objective>
Switch object detection back to YOLOv8n via ONNX Runtime Web (from current MediaPipe EfficientDet-Lite2) and add a configurable vertical crop region. The crop region lets the user focus detection on a specific vertical band of the video (e.g., the horizon area where distant objects appear), giving the model more effective resolution per pixel in that region.

Purpose: YOLOv8n provides better detection accuracy for dashcam use cases, and the vertical crop region dramatically improves distant object detection by concentrating the 640x640 model input on a smaller, more relevant area.

Output: Working ONNX-based object detection with user-adjustable crop bounds and correctly positioned bounding box overlays.
</objective>

<execution_context>
@/Users/thomasburridge/.ccs/instances/personal/get-shit-done/workflows/execute-plan.md
@/Users/thomasburridge/.ccs/instances/personal/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/services/ObjectDetector.ts
@src/hooks/useDetection.ts
@src/components/DetectionOverlay.tsx
@src/store/appStore.ts
@src/App.tsx
@package.json
@vite.config.ts

Reference: The working YOLOv8n ONNX implementation existed at git commit 40a999b. The local model file already exists at public/models/yolov8n.onnx. The project uses npm (package-lock.json exists, no packageManager field in package.json).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Swap dependencies and restore ONNX ObjectDetector with crop region support</name>
  <files>
    package.json
    vite.config.ts
    src/services/ObjectDetector.ts
  </files>
  <action>
    1. In package.json: Remove `"@mediapipe/tasks-vision": "^0.10.32"` from dependencies. Add `"onnxruntime-web": "^1.22.0"` to dependencies. Run `npm install`.

    2. In vite.config.ts: Add `optimizeDeps: { exclude: ['onnxruntime-web'] }` to the defineConfig object.

    3. Rewrite src/services/ObjectDetector.ts based on the proven implementation from git commit 40a999b, with these modifications:

    - Keep the same Detection/DetectionConfig interfaces
    - Use local model path: `const MODEL_URL = '/models/yolov8n.onnx';`
    - Use execution providers: `['webgl', 'wasm']` (NOT webgpu -- avoids COOP/COEP header requirements per project decision)
    - Keep the full COCO_LABELS array (80 classes)
    - Keep targetClasses as: `['car', 'person', 'truck', 'bus', 'bicycle', 'motorcycle', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe']`
    - Canvas context MUST use `{ willReadFrequently: true }` option for getImageData performance
    - Keep the existing NMS implementation (iouThreshold = 0.45)

    CROP REGION MODIFICATION to preprocess():
    - Change the `detect()` method signature to: `async detect(video: HTMLVideoElement, cropTop: number, cropBottom: number): Promise<Detection[]>`
    - `cropTop` and `cropBottom` are percentages (0-100) of the video height
    - Also accept these in `preprocess()`: `preprocess(video, cropTop, cropBottom)`
    - In `preprocess()`, instead of drawing the full video frame, use `ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh)` where:
      - `sx = 0` (full width)
      - `sy = Math.round(vh * cropTop / 100)` (start Y in video pixels)
      - `sw = vw` (full width)
      - `sh = Math.round(vh * (cropBottom - cropTop) / 100)` (cropped height in video pixels)
      - The destination coordinates use letterboxing to fit this cropped region into 640x640
    - Store `cropOffsetY = sy` in the letterbox info object for postprocessing
    - The letterbox scale calculation should use `sw` and `sh` (the cropped dimensions) instead of `vw` and `vh`

    CROP REGION MODIFICATION to postprocess():
    - Add `cropOffsetY` to the letterbox type: `{ scale: number; padX: number; padY: number; cropOffsetY: number }`
    - When converting from model space back to video pixel space, add `cropOffsetY` to the Y coordinate:
      - `const y = (cy - h / 2 - padY) / scale + cropOffsetY;`
    - The X coordinate mapping stays the same (full width, no horizontal crop)
    - Clip to full video bounds (videoWidth, videoHeight) since we want to display in full-frame coordinates

    If cropTop=0 and cropBottom=100 (defaults), behavior is identical to the original full-frame detection.
  </action>
  <verify>
    Run `npm run build` -- should compile with no TypeScript errors. Verify `onnxruntime-web` is in node_modules. Verify no references to `@mediapipe/tasks-vision` remain in source files.
  </verify>
  <done>
    ObjectDetector.ts compiles, uses ONNX Runtime Web with local model, accepts cropTop/cropBottom parameters, and correctly maps cropped-space detections back to full-frame video coordinates.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update useDetection hook, appStore crop state, and DetectionOverlay</name>
  <files>
    src/store/appStore.ts
    src/hooks/useDetection.ts
    src/components/DetectionOverlay.tsx
  </files>
  <action>
    1. In src/store/appStore.ts, add crop region state:
      - Add to AppState interface:
        - `cropTop: number;` (default: 0)
        - `cropBottom: number;` (default: 100)
        - `setCropRegion: (top: number, bottom: number) => void;`
      - Add to initial state: `cropTop: 0, cropBottom: 100`
      - Add action: `setCropRegion: (top, bottom) => set({ cropTop: top, cropBottom: bottom })`

    2. Rewrite src/hooks/useDetection.ts to use requestAnimationFrame with back-pressure:
      - The hook signature stays the same: `useDetection(videoRef, enabled)` returning `{ detections, modelLoading }`
      - Instead of `setTimeout` at a fixed interval, use `requestAnimationFrame` with a `busyRef`:
        ```
        const busyRef = useRef(false);
        const rafRef = useRef<number>(0);

        const loop = () => {
          rafRef.current = requestAnimationFrame(loop);
          if (busyRef.current) return; // skip if previous inference still running
          busyRef.current = true;
          const { cropTop, cropBottom } = useAppStore.getState();
          detector.detect(video, cropTop, cropBottom)
            .then(results => { setDetections(results); })
            .catch(err => { console.error('[useDetection]', err); })
            .finally(() => { busyRef.current = false; });
        };
        ```
      - Start the loop by calling `rafRef.current = requestAnimationFrame(loop);`
      - Cleanup: `cancelAnimationFrame(rafRef.current);`
      - The `detect()` call is now async (returns Promise), so use `.then()` inside rAF -- do NOT await inside the rAF callback
      - Read cropTop/cropBottom from `useAppStore.getState()` (direct store access, not via hook subscription -- avoids re-renders on every crop change)
      - Keep the model loading logic in a separate useEffect as before
      - Keep the cleanup/dispose logic on unmount

    3. In src/components/DetectionOverlay.tsx:
      - Add a visual indicator for the crop region: draw two semi-transparent horizontal bars (rgba(0,0,0,0.3)) on the canvas representing the areas OUTSIDE the crop region (top bar from 0 to cropTop%, bottom bar from cropBottom% to 100%)
      - Read cropTop/cropBottom from `useAppStore()` (reactive subscription is fine here since this is a rendering component)
      - The bounding box drawing code does NOT need to change because ObjectDetector.postprocess() already maps detections back to full-frame coordinates
      - Keep all existing drawing logic (rounded rect boxes, labels, colors, object-fit:cover transformation)
      - Add cropTop and cropBottom to the useEffect dependency array for the drawing effect
  </action>
  <verify>
    Run `npm run build` -- no TypeScript errors. Check that useDetection.ts imports useAppStore. Check that DetectionOverlay draws crop region indicators.
  </verify>
  <done>
    Detection loop runs via rAF with back-pressure, passes crop region to ObjectDetector, and DetectionOverlay visually indicates the active crop zone with darkened areas outside the crop bounds.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create CropRegionControl component and wire into App</name>
  <files>
    src/components/CropRegionControl.tsx
    src/App.tsx
  </files>
  <action>
    1. Create src/components/CropRegionControl.tsx:
      - A vertical control on the right side of the screen (mirroring ZoomControl on the left) that lets the user set cropTop and cropBottom percentages
      - Use two HTML range inputs (type="range"), both vertical (`[writing-mode:vertical-lr]`), styled to match the dashcam HUD aesthetic (similar to ZoomControl)
      - Layout: Fixed right side (`fixed right-5 top-1/2 -translate-y-1/2 z-[100]`), vertically centered. Show "CROP" label at bottom in `text-white/30`. Show current crop range (e.g., "20-80%") at top in `text-hud/70`.
      - The top slider controls cropTop (0-100, step 5), rendered with `[direction:rtl]` so dragging UP increases value visually. The bottom slider controls cropBottom (0-100, step 5).
      - Enforce constraint: cropTop must be less than cropBottom (minimum 10% gap). If user drags cropTop past cropBottom-10, clamp it. Same for cropBottom.
      - Read state from `useAppStore()`: cropTop, cropBottom, setCropRegion, detectionEnabled
      - Only render when detectionEnabled is true (no point showing crop controls if detection is off)
      - Use Tailwind classes only, no custom CSS files. Style consistently with ZoomControl: `font-mono text-[10px] tracking-wider`

    2. In src/App.tsx:
      - Import CropRegionControl
      - Add `<CropRegionControl />` after `<ZoomControl />` in the JSX
      - No props needed -- component reads from Zustand store directly
      - The useDetection hook API hasn't changed (still takes videoRef and enabled), so no changes needed to the existing call site
      - Keep passing detections to DetectionOverlay as before since the overlay still needs them for drawing
  </action>
  <verify>
    Run `npm run build` -- no TypeScript errors. Run `npm run dev` and verify:
    1. The crop control appears on the right side when detection is enabled
    2. Adjusting the sliders changes the darkened crop indicator regions on the detection overlay
    3. Object detection bounding boxes appear within the crop region and are positioned correctly in the full video frame
  </verify>
  <done>
    CropRegionControl renders on the right side with two sliders for top/bottom crop bounds. Adjusting them visually updates the crop overlay and changes the region sent to the ONNX detector. Detection bounding boxes are correctly positioned relative to the full video frame regardless of crop settings.
  </done>
</task>

</tasks>

<verification>
1. `npm run build` compiles without errors
2. No references to `@mediapipe/tasks-vision` remain in source code
3. `onnxruntime-web` is installed and excluded from Vite optimizeDeps
4. Detection runs with local `/models/yolov8n.onnx` model
5. Default crop (0-100%) produces identical behavior to full-frame detection
6. Adjusting crop sliders visually narrows the detection band
7. Bounding boxes drawn at correct full-frame positions even with non-default crop
8. rAF loop with back-pressure prevents frame stacking during slow inference
</verification>

<success_criteria>
- YOLOv8n ONNX detection running on main thread with WebGL provider
- Configurable crop region (cropTop/cropBottom) adjustable via right-side UI control
- Detection overlay shows darkened regions outside crop bounds
- Bounding boxes correctly mapped from cropped inference coordinates to full video frame
- No MediaPipe dependencies remain in the project
</success_criteria>

<output>
After completion, create `.planning/quick/6-switch-to-yolov8n-onnx-with-configurable/6-SUMMARY.md`
</output>
