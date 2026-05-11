/**
 * app.js — Main Application Controller
 * 
 * Manages camera access, torch control, frame processing,
 * real-time waveform rendering, and UI orchestration.
 */

import { SignalProcessor } from './signal.js';

// ── DOM Elements ──
const $ = id => document.getElementById(id);

const elements = {
    // Screens
    welcomeScreen: $('welcome-screen'),
    measureScreen: $('measure-screen'),
    resultsScreen: $('results-screen'),

    // Camera
    video: $('camera-video'),
    processingCanvas: $('processing-canvas'),

    // Welcome
    startBtn: $('start-btn'),

    // Measurement
    statusDot: $('status-dot'),
    statusText: $('status-text'),
    cancelBtn: $('cancel-btn'),
    fingerPrompt: $('finger-prompt'),
    bpmDisplay: $('bpm-display'),
    bpmValue: $('bpm-value'),
    heartbeatIcon: $('heartbeat-icon'),
    waveformContainer: $('waveform-container'),
    waveformCanvas: $('waveform-canvas'),
    stabilizingOverlay: $('stabilizing-overlay'),
    progressSection: $('progress-section'),
    progressRingFill: $('progress-ring-fill'),
    progressTime: $('progress-time'),

    // Results
    resultBpm: $('result-bpm'),
    resultQuality: $('result-quality'),
    resultQualityIcon: $('result-quality-icon'),
    resultQualityText: $('result-quality-text'),
    metricRmssd: $('metric-rmssd'),
    metricSdnn: $('metric-sdnn'),
    metricPnn50: $('metric-pnn50'),
    metricMeanRR: $('metric-meanrr'),
    interpretationText: $('interpretation-text'),
    measureAgainBtn: $('measure-again-btn'),
    backHomeBtn: $('back-home-btn'),

    // Toast
    toast: $('toast'),
};

// ── State ──
const state = {
    stream: null,
    videoTrack: null,
    torchSupported: false,
    animationFrameId: null,
    processingCtx: null,

    // Measurement phases
    phase: 'idle', // idle | detecting | stabilizing | measuring | done
    fingerDetected: false,
    stabilizeStartTime: 0,
    measureStartTime: 0,
    measureDuration: 30000, // 30 seconds
    stabilizeDuration: 4000, // 4 seconds

    // Signal
    lastBeatTime: 0,
    prevPeakCount: 0,
};

const signal = new SignalProcessor();

// ── Waveform Drawing ──
let waveformCtx = null;
let waveformWidth = 0;
let waveformHeight = 0;
const WAVEFORM_POINTS = 200;

function initWaveformCanvas() {
    const canvas = elements.waveformCanvas;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    waveformWidth = rect.width;
    waveformHeight = rect.height;
    canvas.width = waveformWidth * dpr;
    canvas.height = waveformHeight * dpr;
    waveformCtx = canvas.getContext('2d');
    waveformCtx.scale(dpr, dpr);
}

function drawWaveform(filteredData, peaks) {
    if (!waveformCtx) return;

    const ctx = waveformCtx;
    const w = waveformWidth;
    const h = waveformHeight;

    ctx.clearRect(0, 0, w, h);

    if (filteredData.length < 2) return;

    // Take the last N points
    const data = filteredData.slice(-WAVEFORM_POINTS);
    const peakSet = new Set(peaks.map(p => p - (filteredData.length - data.length)).filter(p => p >= 0));

    // Find range for normalization
    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const padding = 12;
    const drawH = h - padding * 2;
    const stepX = w / (WAVEFORM_POINTS - 1);

    // Draw glow
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
        const x = i * stepX;
        const y = padding + drawH - ((data[i].value - minVal) / range) * drawH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(0, 230, 118, 0.15)';
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw main line
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
        const x = i * stepX;
        const y = padding + drawH - ((data[i].value - minVal) / range) * drawH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(0, 230, 118, 0.3)');
    gradient.addColorStop(0.5, '#00e676');
    gradient.addColorStop(1, '#69f0ae');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw fill under curve
    ctx.lineTo(data.length * stepX, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, 'rgba(0, 230, 118, 0.12)');
    fillGrad.addColorStop(1, 'rgba(0, 230, 118, 0)');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Draw peak markers
    peakSet.forEach(idx => {
        if (idx >= 0 && idx < data.length) {
            const x = idx * stepX;
            const y = padding + drawH - ((data[idx].value - minVal) / range) * drawH;

            // Glow
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 59, 92, 0.25)';
            ctx.fill();

            // Dot
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3b5c';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
    });

    // Center line
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
}

// ── Camera Management ──
async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 320 },
                height: { ideal: 240 },
            },
            audio: false
        };

        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        state.videoTrack = state.stream.getVideoTracks()[0];

        elements.video.srcObject = state.stream;
        await elements.video.play();

        // Set up processing canvas
        const settings = state.videoTrack.getSettings();
        elements.processingCanvas.width = settings.width || 320;
        elements.processingCanvas.height = settings.height || 240;
        state.processingCtx = elements.processingCanvas.getContext('2d', { willReadFrequently: true });

        // Try to enable torch
        await enableTorch();

        return true;
    } catch (err) {
        console.error('Camera access failed:', err);
        if (err.name === 'NotAllowedError') {
            showToast('Camera permission denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
            showToast('No camera found. This app requires a rear-facing camera.');
        } else {
            showToast(`Camera error: ${err.message}`);
        }
        return false;
    }
}

async function enableTorch() {
    try {
        if (state.videoTrack && state.videoTrack.getCapabilities) {
            const capabilities = state.videoTrack.getCapabilities();
            if (capabilities.torch) {
                await state.videoTrack.applyConstraints({
                    advanced: [{ torch: true }]
                });
                state.torchSupported = true;
                console.log('Torch enabled');
                return;
            }
        }
        state.torchSupported = false;
        console.warn('Torch not supported on this device');
        showToast('Flash not available — measurement may be less accurate');
    } catch (err) {
        state.torchSupported = false;
        console.warn('Could not enable torch:', err);
    }
}

function stopCamera() {
    if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
    }

    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
        state.videoTrack = null;
    }

    elements.video.srcObject = null;
}

// ── Frame Processing ──
function processFrame() {
    if (state.phase === 'idle' || state.phase === 'done') return;

    state.animationFrameId = requestAnimationFrame(processFrame);

    const ctx = state.processingCtx;
    const video = elements.video;
    const canvas = elements.processingCanvas;

    if (video.readyState < video.HAVE_CURRENT_DATA) return;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Sample a central region (middle 50%)
    const regionX = Math.floor(canvas.width * 0.25);
    const regionY = Math.floor(canvas.height * 0.25);
    const regionW = Math.floor(canvas.width * 0.5);
    const regionH = Math.floor(canvas.height * 0.5);

    const imageData = ctx.getImageData(regionX, regionY, regionW, regionH);
    const pixels = imageData.data;

    // Calculate average RGB
    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = pixels.length / 4;

    for (let i = 0; i < pixels.length; i += 4) {
        totalR += pixels[i];
        totalG += pixels[i + 1];
        totalB += pixels[i + 2];
    }

    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;

    const now = performance.now();

    // Finger detection: red channel dominant and high overall brightness
    const isFingerCovering = avgR > 80 && avgR > avgG * 1.3 && avgR > avgB * 1.3;

    if (state.phase === 'detecting') {
        handleDetecting(isFingerCovering, now);
    }

    if (isFingerCovering && (state.phase === 'stabilizing' || state.phase === 'measuring')) {
        // Add the red channel average as the PPG signal
        signal.addSample(avgR, now);

        // Process and update UI
        const result = signal.process();

        if (state.phase === 'stabilizing') {
            handleStabilizing(now);
        }

        if (state.phase === 'measuring') {
            handleMeasuring(result, now);
        }
    } else if (!isFingerCovering && state.phase !== 'detecting') {
        // Finger was removed during measurement
        handleFingerLost();
    }
}

function handleDetecting(fingerDetected, now) {
    if (fingerDetected) {
        if (!state.fingerDetected) {
            state.fingerDetected = true;
            state.stabilizeStartTime = now;

            // Transition to stabilizing
            state.phase = 'stabilizing';
            elements.fingerPrompt.style.display = 'none';
            elements.waveformContainer.style.display = 'block';
            elements.stabilizingOverlay.classList.add('active');
            elements.statusDot.className = 'status-dot detecting';
            elements.statusText.textContent = 'Stabilizing…';

            initWaveformCanvas();
        }
    }
}

function handleStabilizing(now) {
    const elapsed = now - state.stabilizeStartTime;

    if (elapsed >= state.stabilizeDuration) {
        // Transition to measuring
        state.phase = 'measuring';
        state.measureStartTime = now;
        signal.reset(); // Clear stabilization data

        elements.stabilizingOverlay.classList.remove('active');
        elements.bpmDisplay.style.display = 'block';
        elements.progressSection.style.display = 'block';
        elements.statusDot.className = 'status-dot measuring';
        elements.statusText.textContent = 'Measuring…';
    }
}

function handleMeasuring(result, now) {
    const elapsed = now - state.measureStartTime;
    const remaining = Math.max(0, state.measureDuration - elapsed);
    const progress = Math.min(1, elapsed / state.measureDuration);

    // Update progress ring
    const circumference = 2 * Math.PI * 36; // r=36
    elements.progressRingFill.style.strokeDashoffset = circumference * (1 - progress);
    elements.progressTime.textContent = `${Math.ceil(remaining / 1000)}s`;

    // Update BPM display
    if (result.bpm > 0) {
        elements.bpmValue.textContent = result.bpm;

        // Beat animation
        if (result.peaks.length > state.prevPeakCount) {
            triggerBeatAnimation();
            state.prevPeakCount = result.peaks.length;
        }
    }

    // Draw waveform
    drawWaveform(result.filtered, result.peaks);

    // Check if measurement is complete
    if (elapsed >= state.measureDuration) {
        completeMeasurement();
    }
}

function handleFingerLost() {
    // Reset to detecting phase
    state.phase = 'detecting';
    state.fingerDetected = false;
    signal.reset();

    elements.fingerPrompt.style.display = 'flex';
    elements.bpmDisplay.style.display = 'none';
    elements.waveformContainer.style.display = 'none';
    elements.progressSection.style.display = 'none';
    elements.stabilizingOverlay.classList.remove('active');
    elements.bpmValue.textContent = '--';
    elements.statusDot.className = 'status-dot';
    elements.statusText.textContent = 'Waiting for finger…';
    state.prevPeakCount = 0;

    showToast('Finger lost — please place it back on the camera');
}

function triggerBeatAnimation() {
    elements.bpmValue.classList.add('beat');
    elements.heartbeatIcon.classList.add('beating');
    setTimeout(() => {
        elements.bpmValue.classList.remove('beat');
    }, 150);
}

// ── Measurement Completion ──
function completeMeasurement() {
    state.phase = 'done';
    stopCamera();

    const finalResult = signal.process();
    const hrv = signal.calculateHRV();
    const quality = signal.assessQuality();

    // Populate results
    elements.resultBpm.textContent = finalResult.bpm || '--';

    // Quality badge
    const qualityClass = quality.label.toLowerCase();
    elements.resultQuality.className = `result-quality ${qualityClass}`;
    elements.resultQualityText.textContent = `${quality.label} Quality`;

    if (hrv) {
        elements.metricRmssd.textContent = hrv.rmssd;
        elements.metricSdnn.textContent = hrv.sdnn;
        elements.metricPnn50.textContent = hrv.pnn50;
        elements.metricMeanRR.textContent = hrv.meanRR;
        elements.interpretationText.textContent = generateInterpretation(finalResult.bpm, hrv, quality);
    } else {
        elements.metricRmssd.textContent = '--';
        elements.metricSdnn.textContent = '--';
        elements.metricPnn50.textContent = '--';
        elements.metricMeanRR.textContent = '--';
        elements.interpretationText.textContent = 'Not enough heartbeat data was collected for HRV analysis. Try again with your finger pressed firmly on the camera.';
    }

    showScreen('results');
}

function generateInterpretation(bpm, hrv, quality) {
    const parts = [];

    // Heart rate interpretation
    if (bpm >= 60 && bpm <= 100) {
        parts.push(`Your resting heart rate of ${bpm} BPM is within the normal range (60–100 BPM).`);
    } else if (bpm < 60) {
        parts.push(`Your heart rate of ${bpm} BPM is below the typical resting range. This can be normal for athletes or during rest.`);
    } else {
        parts.push(`Your heart rate of ${bpm} BPM is above the typical resting range. This can be normal after activity or caffeine.`);
    }

    // RMSSD interpretation
    if (hrv.rmssd >= 20 && hrv.rmssd <= 100) {
        parts.push(`Your RMSSD of ${hrv.rmssd} ms indicates healthy autonomic nervous system function.`);
    } else if (hrv.rmssd > 100) {
        parts.push(`Your RMSSD of ${hrv.rmssd} ms is high, suggesting strong parasympathetic activity — a sign of good recovery.`);
    } else {
        parts.push(`Your RMSSD of ${hrv.rmssd} ms is lower than average, which could indicate stress, fatigue, or dehydration.`);
    }

    // Quality note
    if (quality.score < 60) {
        parts.push(`Signal quality was ${quality.label.toLowerCase()} (${quality.details}). Results may be less accurate.`);
    }

    return parts.join(' ');
}

// ── Screen Navigation ──
function showScreen(name) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));

    const target = $(`${name}-screen`);
    if (target) {
        // Small delay to allow CSS transition
        requestAnimationFrame(() => {
            target.classList.add('active');
        });
    }
}

// ── Toast ──
let toastTimeout = null;
function showToast(message) {
    const toast = elements.toast;
    toast.textContent = message;
    toast.classList.add('visible');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('visible');
    }, 3500);
}

// ── Measurement Flow ──
async function startMeasurement() {
    signal.reset();
    state.phase = 'detecting';
    state.fingerDetected = false;
    state.prevPeakCount = 0;

    // Reset UI
    elements.fingerPrompt.style.display = 'flex';
    elements.bpmDisplay.style.display = 'none';
    elements.waveformContainer.style.display = 'none';
    elements.progressSection.style.display = 'none';
    elements.bpmValue.textContent = '--';
    elements.heartbeatIcon.classList.remove('beating');
    elements.statusDot.className = 'status-dot';
    elements.statusText.textContent = 'Waiting for finger…';

    // Reset progress ring
    const circumference = 2 * Math.PI * 36;
    elements.progressRingFill.style.strokeDashoffset = circumference;

    showScreen('measure');

    const cameraReady = await startCamera();
    if (!cameraReady) {
        showScreen('welcome');
        return;
    }

    // Start frame processing loop
    processFrame();
}

function cancelMeasurement() {
    state.phase = 'idle';
    stopCamera();
    signal.reset();
    showScreen('welcome');
}

// ── Event Listeners ──
elements.startBtn.addEventListener('click', startMeasurement);
elements.cancelBtn.addEventListener('click', cancelMeasurement);
elements.measureAgainBtn.addEventListener('click', startMeasurement);
elements.backHomeBtn.addEventListener('click', () => {
    signal.reset();
    showScreen('welcome');
});

// Handle visibility change (stop camera when app goes to background)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase !== 'idle' && state.phase !== 'done') {
        cancelMeasurement();
        showToast('Measurement cancelled — app went to background');
    }
});

// Prevent pull-to-refresh on mobile
document.body.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        const target = e.target.closest('.screen');
        if (target && target.scrollTop <= 0) {
            e.preventDefault();
        }
    }
}, { passive: false });

// Handle resize for waveform canvas
window.addEventListener('resize', () => {
    if (waveformCtx) {
        initWaveformCanvas();
    }
});

console.log('Pulse HRV app initialized');
