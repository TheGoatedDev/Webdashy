# webdashy Brand Guidelines

> Generated: 2026-02-21

---

## 1. Brand Overview

**webdashy** is a browser-native dashcam for general drivers who want the protection of a dashcam without buying hardware, without cloud accounts, and without giving their data to anyone. It runs in your browser, records locally, and uses AI to detect what matters — all without asking permission from an app store or a subscription service.

This is The Outlaw archetype: challenging the assumption that you need proprietary hardware to record your drive.

---

## 2. Brand Position

| Axis | Position |
|---|---|
| **Type** | Consumer app |
| **Audience** | General drivers |
| **Core differentiator** | Browser-native — no install, no hardware, no cloud |
| **Emotional promise** | Safe & protected · In control · Technically capable |
| **Archetype** | The Outlaw (Rebel / Disruptor cluster) |

---

## 3. Brand Personality Spectra

```
Serious    ◆ · · · ·    Playful
Minimal    · ◆ · · ·    Intense
Warm       · · · ◆ ·    Cool
Quiet      · · ◆ · ·    Loud   (quiet at rest, sharp on alert)
Human      · · ◆ · ·    Machine
```

webdashy sits firmly serious, slightly minimal, cool in palette and feel, with a human enough voice to guide new users — but a system-output terseness when things are operating normally.

---

## 4. Color Palette

All colors are used intentionally. Nothing decorative.

### Core Tokens

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-rec` | Record Red | `#FF3B30` | Recording active state, critical alerts, glow animations |
| `--color-hud` | HUD Teal | `#00D4AA` | Active data, detection hits, key status — used sparingly |
| `--color-warn` | Warn Amber | `#FFD60A` | Warnings, caution states, secondary alerts |

### Backgrounds & Surfaces

| Name | Hex | Usage |
|---|---|---|
| Canvas Black | `#000000` | Page/root background |
| Surface Dark | `#111111` | Primary panel surfaces |
| Surface Elevated | `#1A1A1A` | Cards, overlays, drawers |
| Surface Border | `#2A2A2A` | Dividers, outlines, inactive borders |
| Surface Hover | `#222222` | Interactive hover state |

### Text

| Name | Hex | Usage |
|---|---|---|
| Text Primary | `#FFFFFF` | Primary content, labels |
| Text Secondary | `#A0A0A0` | Metadata, secondary labels, timestamps |
| Text Muted | `#555555` | Disabled states, fine print |

### Semantic Colors

| Name | Hex | Token alias |
|---|---|---|
| Success | `#00D4AA` | `--color-hud` |
| Warning | `#FFD60A` | `--color-warn` |
| Error | `#FF3B30` | `--color-rec` |
| Info | `#0090CC` | — |

### Color Rules

- **HUD Teal is earned** — only appears when something is actively happening (detection hit, live stat, active mode). Not used for decoration.
- **Record Red is an event** — blinks, glows, pulses. Never static as a label colour.
- **No gradients** — flat fills only. Colour stops at surfaces.
- **No opacity washes** — prefer `#1A1A1A` over `rgba(255,255,255,0.05)` where possible.
- **No pastels** — if a colour can't hold contrast against `#000`, it doesn't belong here.

---

## 5. Typography

### Typefaces

| Role | Family | Weights | Source |
|---|---|---|---|
| **Display** | Chakra Petch | 300, 400, 500, 600, 700 | Google Fonts |
| **Monospace** | Share Tech Mono | 400 | Google Fonts |

**Fallback stacks:**
```css
--font-display: 'Chakra Petch', 'Rajdhani', sans-serif;
--font-mono: 'Share Tech Mono', 'Courier New', monospace;
```

### Usage

- **Chakra Petch** — all UI chrome, labels, headings, buttons, navigation
- **Share Tech Mono** — numeric data (speed, timestamps, plate strings, coordinates), system output, code
- **No third typeface** — ever. Two fonts, no exceptions.

### Scale Principles

- Labels are **uppercase or small-caps** when terse — feels like instrument readout
- Numbers and data always render in mono
- Long-form text (settings descriptions, onboarding) uses Chakra Petch at regular weight, not bold

---

## 6. Shape & Layout

- **Border radius:** Sharp. Use `rounded-sm` (2px) at most for interactive elements. Never `rounded-lg`, `rounded-xl`, or `rounded-full` on functional UI elements.
- **Spacing:** Dense and deliberate. The UI is an instrument panel, not a landing page.
- **Icons:** Angular, geometric, line-based. No rounded icon sets.
- **Animations:** Functional only — pulse for recording state, flash for new plate capture, slide-in for toasts. No decorative motion.
- **Overlays:** Semi-transparent dark panels (`bg-black/70` or similar) for video overlays. Never frosted glass or blur effects.

### Anti-Patterns (never do)

| Pattern | Why |
|---|---|
| Large border radius (`rounded-lg`+) | Too friendly, consumer-app softness |
| Gradient backgrounds | Too lifestyle/Instagram |
| Illustrations or mascots | Brand is a tool, not a character |
| Pastel or muted colours | Palette must hold contrast at all times |
| Frosted glass / backdrop blur | Adds visual noise without information |

---

## 7. Voice & Tone

### Archetype Voice: The Outlaw

webdashy doesn't apologise for being a dashcam in a browser. It doesn't try to charm you. It tells you what it's doing and gets out of the way.

### Formality

**Casual but competent.** Speaks plainly, skips jargon, never hedges. Knows exactly what it's doing and shows that through confidence, not vocabulary.

### Person

| Context | Person | Example |
|---|---|---|
| Status / system output | System voice (no person) | `Recording active.` |
| Onboarding / guidance | Second person | `Grant camera access to start recording.` |
| Errors | Second person + direct | `Camera access was denied. Check your browser permissions.` |

### Tone Shift in Errors / Warnings

Errors sharpen. Fewer words, higher urgency. No softening language, no "Oops!" Never apologise for a system state. State it, then point forward.

### Vocabulary Rules

| Use | Avoid |
|---|---|
| Plain English verbs | Corporate jargon ("leverage", "utilise") |
| Specific nouns (camera, clip, plate) | Vague nouns ("solution", "experience") |
| Local / on-device / your device | Cloud, sync, upload, "we keep it safe" |
| Detection, identify, flag | "AI-powered", "intelligent", "smart" as empty modifiers |
| Might, may | Always, guaranteed, infallible |

---

## 8. Sample Copy

### Landing / Marketing

> **Your browser is already a dashcam.**
>
> webdashy turns any device with a camera into a dashcam — no hardware, no accounts, no data leaving your car. Record, detect, and capture plates entirely on-device.

### In-App (Onboarding)

> To start recording, you need to grant camera access. webdashy never stores your footage in the cloud — everything stays on your device, in your browser.

### Error State

> **Storage full.**
> Old clips are being cleared to make room. Adjust storage limits in Settings to control how much space webdashy uses.

### Warning State

> **Background tab detected.**
> Recording will pause in 10 seconds. Keep this tab visible to continue.

### GitHub README tagline

> Browser-native dashcam with on-device object detection. No hardware. No cloud. No install.

---

## 9. What webdashy Never Does

- **Never uses cloud language** — no "sync", "upload", "your data is safe with us". Everything is local.
- **Never over-promises on AI** — detection is a tool, not magic. Don't market it as infallible.
- **Never uses fear-based marketing** — no horror stories, no "what if something happens?". Trust the user to know why they want a dashcam.
- **Never uses corporate jargon** — no "leverage", "synergies", "solutions". Plain language only.

---

## 10. Brand in Practice

### PWA / App Icon

- Dark background (`#000` or `#111`)
- Minimal geometric mark — camera aperture or lens motif
- HUD Teal accent only if it serves the form
- No gradients, no shadows

### Recording State

- Record Red (`#FF3B30`) is the only visual indicator needed — animated pulse
- Everything else dims to let it read

### Detection Overlay

- HUD Teal bounding boxes/labels on the video feed
- Share Tech Mono for all detected data (class, confidence, plate string)
- Labels are minimal: class name + confidence percentage only

### Empty States

- Terse, system-output phrasing
- No illustrations, no "Nothing here yet!" perkiness
- Example: `No clips saved.` — full stop, done

---

*webdashy Brand Guidelines — v1.0 — 2026-02-21*
