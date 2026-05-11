# Pulse HRV — Technical Reference

## Overview
A mobile web app that measures **heart rate (BPM)** and **heart rate variability (HRV)** using the phone's rear camera and flash via photoplethysmography (PPG). The user places their fingertip over the camera lens; the app captures video frames, extracts the red channel signal (which fluctuates with blood volume), and applies signal processing to derive cardiac metrics.

**Live at:** `parimalam.me`
**Target device:** iPhone SE (small screen, 375×667 viewport) — must look good here first.

## Architecture

```
index.html          — 3-screen SPA: Welcome → Measurement → Results
├── style.css       — Premium dark theme, responsive down to iPhone SE
├── app.js          — Camera, torch, frame loop, waveform rendering, UI orchestration
└── signal.js       — PPG signal processing pipeline (ES module)
```

No build tools, no frameworks. Pure HTML/CSS/JS served as static files.
`app.js` imports `signal.js` as an ES module (`type="module"`).

## Signal Processing Pipeline (`signal.js`)

The `SignalProcessor` class processes the entire raw buffer on every animation frame:

1. **Smoothing** — 5-point moving average on raw red channel values
2. **Detrending** — Subtract 61-point (~2s) moving average to remove baseline wander from finger pressure drift
3. **Bandpass filter** — 2nd-order Butterworth biquad sections (high-pass at 0.67 Hz + low-pass at 3.33 Hz), applied as **zero-phase** (forward + backward pass) for clean, phase-distortion-free peaks
4. **Adaptive peak detection** — Sliding 90-sample (~3s) window computes local min/max; peaks must exceed `localMin + 0.4 × localRange`; enforces 300ms minimum refractory period
5. **RR interval validation** — Physiological bounds (300–2000ms), then **median-based outlier rejection** (>25% deviation from median is discarded)
6. **BPM calculation** — Median of last 15 valid RR intervals, smoothed with exponential moving average (α=0.3)

### Key config knobs
| Parameter | Default | Purpose |
|---|---|---|
| `smoothingWindow` | 5 | Initial noise reduction |
| `detrendWindow` | 61 | Baseline wander removal window |
| `peakThresholdFactor` | 0.4 | Local amplitude fraction for peak threshold |
| `peakWindowSize` | 90 | Samples in adaptive threshold window |
| `maxRRDeviationFactor` | 0.25 | Max allowed deviation from median RR |
| `bpmSmoothingAlpha` | 0.3 | EMA responsiveness (lower = smoother) |
| `minIntervalsForBPM` | 3 | Min valid intervals before showing BPM |

## App Flow (`app.js`)

### Measurement Phases
`idle` → `detecting` → `stabilizing` (4s) → `measuring` (30s) → `done`

- **detecting**: Camera on, torch on, waiting for finger (red channel > 80, dominant over G/B by 1.3×)
- **stabilizing**: Finger detected, 4s settling period (signal.reset() at end to clear noisy data)
- **measuring**: 30s active measurement, real-time waveform + BPM display
- **done**: Camera off, results screen with HRV metrics + interpretation

### Waveform Rendering
Canvas-based, draws the last 200 filtered samples. Green gradient line + glow effect, red dots on detected peaks, subtle fill under curve.

### Beat Animation
Heart emoji pulses and BPM number scales up briefly when a new peak is detected (compares `result.peaks.length` to `prevPeakCount`).

## UI / CSS

### Design System
- **Dark theme**: `#06060b` base, glassmorphism cards with `backdrop-filter: blur()`
- **Accent colors**: Pulse red `#ff3b5c`, health green `#00e676`, blue/purple/amber for metric cards
- **Typography**: Inter (UI), JetBrains Mono (numbers/BPM)
- **Animations**: Logo pulse, heartbeat, status blink, finger bounce, stabilizing spinner

### Responsive Breakpoints
- Default: designed for standard phones (iPhone 12/13/14/15 size)
- `max-height: 680px`: Compact phones (iPhone SE 2nd/3rd gen) — scales down BPM, waveform, progress ring, all padding/gaps
- `max-height: 570px`: Very compact (iPhone SE 1st gen) — further reduction
- `min-width: 420px`: Wider screens get slightly wider card max-width
- `prefers-reduced-motion`: Disables all animations

### Screen Structure
Three `.screen` divs toggled via `.active` class with fade+slide transition. Only one active at a time.
- Welcome + Measurement screens: `position: fixed; inset: 0` (fill viewport exactly)
- Results screen: `position: absolute; min-height: 100dvh` (scrolls naturally — too much content to squish on small phones)

## HRV Metrics (Results Screen)

| Metric | Description |
|---|---|
| RMSSD | Root mean square of successive RR differences (parasympathetic) |
| SDNN | Standard deviation of RR intervals (overall variability) |
| pNN50 | % of successive intervals differing >50ms |
| Mean RR | Average interval between beats (ms) |

Signal quality scored 0–100 based on: data quantity, RR consistency (CV), BPM plausibility, signal amplitude.

## Known Considerations
- Torch support varies by device — app warns if unavailable but continues
- `visibilitychange` cancels measurement if app backgrounds
- Pull-to-refresh disabled via `touchmove` preventDefault
- All screens scroll via `overflow-y: auto` for results that exceed viewport
