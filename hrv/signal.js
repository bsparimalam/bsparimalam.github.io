/**
 * signal.js — PPG Signal Processing Module
 * 
 * Handles filtering, peak detection, heart rate calculation,
 * and HRV metric computation from raw PPG signal data.
 *
 * v2 — Accuracy improvements:
 *   1. Detrending (baseline wander removal)
 *   2. 2nd-order Butterworth bandpass via biquad sections
 *   3. Zero-phase filtering (forward + backward pass)
 *   4. Sliding-window adaptive peak detection
 *   5. RR interval outlier rejection (median-based)
 *   6. Median BPM + exponential smoothing
 */

export class SignalProcessor {
    constructor() {
        // Buffer for raw signal samples: { value, timestamp }
        this.rawBuffer = [];
        this.filteredBuffer = [];
        this.peaks = []; // indices into filteredBuffer
        this.rrIntervals = []; // ms between consecutive peaks

        // Smoothed BPM for display stability
        this.smoothedBPM = 0;

        // Configuration
        this.config = {
            // Bandpass filter range (BPM → Hz)
            minBPM: 40,
            maxBPM: 200,
            // Moving average window for initial smoothing
            smoothingWindow: 5,
            // Detrending window (~2 seconds at 30fps)
            detrendWindow: 61,

            // Peak detection
            minPeakDistanceMs: 300, // caps at 200 BPM
            // Fraction of local range a peak must exceed
            peakThresholdFactor: 0.4,
            // Sliding window for local adaptive threshold (~3s at 30fps)
            peakWindowSize: 90,

            // RR interval validation
            maxRRDeviationFactor: 0.25, // reject >25% from median

            // BPM calculation
            bpmSmoothingAlpha: 0.3, // lower = smoother
            minIntervalsForBPM: 3,

            // Max buffer size (seconds * fps)
            maxBufferSize: 1800, // ~60 seconds at 30fps
        };
    }

    /**
     * Add a new sample to the buffer.
     * @param {number} value - Red channel average intensity
     * @param {number} timestamp - Performance.now() timestamp in ms
     */
    addSample(value, timestamp) {
        this.rawBuffer.push({ value, timestamp });

        // Trim buffer to max size
        if (this.rawBuffer.length > this.config.maxBufferSize) {
            this.rawBuffer.shift();
        }
    }

    /**
     * Get the effective sampling rate from recent samples.
     */
    getSampleRate() {
        if (this.rawBuffer.length < 10) return 30; // default
        const recent = this.rawBuffer.slice(-60);
        const dt = recent[recent.length - 1].timestamp - recent[0].timestamp;
        return (recent.length - 1) / (dt / 1000);
    }

    /**
     * Apply moving average smoothing.
     */
    smooth(data, windowSize) {
        const result = [];
        const half = Math.floor(windowSize / 2);
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            let count = 0;
            for (let j = Math.max(0, i - half); j <= Math.min(data.length - 1, i + half); j++) {
                sum += data[j];
                count++;
            }
            result.push(sum / count);
        }
        return result;
    }

    /**
     * Remove baseline wander by subtracting a large-window moving average.
     * This handles slow drift from finger pressure changes that the
     * bandpass filter alone struggles with.
     */
    detrend(data) {
        const baseline = this.smooth(data, this.config.detrendWindow);
        return data.map((v, i) => v - baseline[i]);
    }

    // ── 2nd-order Butterworth Biquad Filter ──

    /**
     * Apply a biquad (second-order IIR) filter section.
     * Transfer function: H(z) = (a0 + a1*z^-1 + a2*z^-2) / (1 + b1*z^-1 + b2*z^-2)
     */
    applyBiquad(data, a0, a1, a2, b1, b2) {
        const result = new Array(data.length);
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

        for (let i = 0; i < data.length; i++) {
            const x0 = data[i];
            const y0 = a0 * x0 + a1 * x1 + a2 * x2 - b1 * y1 - b2 * y2;
            result[i] = y0;
            x2 = x1; x1 = x0;
            y2 = y1; y1 = y0;
        }

        return result;
    }

    /**
     * 2nd-order Butterworth low-pass filter.
     */
    butterworthLowPass(data, cutoffHz, sampleRate) {
        const wc = Math.tan(Math.PI * cutoffHz / sampleRate);
        const k1 = Math.SQRT2 * wc;
        const k2 = wc * wc;
        const norm = 1 / (1 + k1 + k2);

        const a0 = k2 * norm;
        const a1 = 2 * a0;
        const a2 = a0;
        const b1 = 2 * (k2 - 1) * norm;
        const b2 = (1 - k1 + k2) * norm;

        return this.applyBiquad(data, a0, a1, a2, b1, b2);
    }

    /**
     * 2nd-order Butterworth high-pass filter.
     */
    butterworthHighPass(data, cutoffHz, sampleRate) {
        const wc = Math.tan(Math.PI * cutoffHz / sampleRate);
        const k1 = Math.SQRT2 * wc;
        const k2 = wc * wc;
        const norm = 1 / (1 + k1 + k2);

        const a0 = norm;
        const a1 = -2 * norm;
        const a2 = norm;
        const b1 = 2 * (k2 - 1) * norm;
        const b2 = (1 - k1 + k2) * norm;

        return this.applyBiquad(data, a0, a1, a2, b1, b2);
    }

    /**
     * Zero-phase bandpass filter: forward + backward pass through
     * cascaded high-pass and low-pass 2nd-order Butterworth sections.
     * Eliminates phase distortion and produces cleaner peaks.
     */
    zeroPhaseBandpass(data, sampleRate) {
        const lowCut = this.config.minBPM / 60;  // Hz
        const highCut = this.config.maxBPM / 60;  // Hz

        // Forward pass
        let filtered = this.butterworthHighPass(data, lowCut, sampleRate);
        filtered = this.butterworthLowPass(filtered, highCut, sampleRate);

        // Backward pass (reverse → filter → reverse)
        filtered.reverse();
        filtered = this.butterworthHighPass(filtered, lowCut, sampleRate);
        filtered = this.butterworthLowPass(filtered, highCut, sampleRate);
        filtered.reverse();

        return filtered;
    }

    /**
     * Process the current buffer: filter and detect peaks.
     * Returns the processed signal for visualization.
     */
    process() {
        if (this.rawBuffer.length < 30) {
            return { filtered: [], peaks: [], bpm: 0, rrIntervals: [] };
        }

        const values = this.rawBuffer.map(s => s.value);
        const timestamps = this.rawBuffer.map(s => s.timestamp);
        const sampleRate = this.getSampleRate();

        // Step 1: Smooth the signal
        const smoothed = this.smooth(values, this.config.smoothingWindow);

        // Step 2: Detrend — remove baseline wander
        const detrended = this.detrend(smoothed);

        // Step 3: Zero-phase 2nd-order Butterworth bandpass
        const filtered = this.zeroPhaseBandpass(detrended, sampleRate);

        this.filteredBuffer = filtered.map((v, i) => ({
            value: v,
            timestamp: timestamps[i]
        }));

        // Step 4: Adaptive peak detection with sliding window
        this.peaks = this.detectPeaks(filtered, timestamps);

        // Step 5: Calculate and validate RR intervals
        this.rrIntervals = this.calculateRRIntervals();

        // Step 6: Calculate smoothed BPM
        const bpm = this.calculateBPM();

        return {
            filtered: this.filteredBuffer,
            peaks: this.peaks,
            bpm,
            rrIntervals: this.rrIntervals
        };
    }

    /**
     * Sliding-window adaptive threshold peak detection.
     * Uses local signal statistics instead of global, making it robust
     * to amplitude changes during measurement.
     */
    detectPeaks(signal, timestamps) {
        if (signal.length < 10) return [];

        const peaks = [];
        const windowSize = this.config.peakWindowSize;
        const minDistMs = this.config.minPeakDistanceMs;
        const threshFactor = this.config.peakThresholdFactor;

        for (let i = 2; i < signal.length - 2; i++) {
            // Local maximum check (5-point)
            if (signal[i] <= signal[i - 1] || signal[i] <= signal[i - 2] ||
                signal[i] < signal[i + 1] || signal[i] < signal[i + 2]) {
                continue;
            }

            // Compute LOCAL adaptive threshold from sliding window
            const winStart = Math.max(0, i - Math.floor(windowSize / 2));
            const winEnd = Math.min(signal.length, i + Math.floor(windowSize / 2));
            let localMin = Infinity, localMax = -Infinity;
            for (let j = winStart; j < winEnd; j++) {
                if (signal[j] < localMin) localMin = signal[j];
                if (signal[j] > localMax) localMax = signal[j];
            }

            const localRange = localMax - localMin;
            if (localRange < 0.001) continue; // flat signal, no peaks

            const threshold = localMin + localRange * threshFactor;
            if (signal[i] < threshold) continue;

            // Enforce minimum distance from last accepted peak
            if (peaks.length > 0) {
                const lastPeakTime = timestamps[peaks[peaks.length - 1]];
                const currentTime = timestamps[i];
                if (currentTime - lastPeakTime < minDistMs) {
                    // Keep the larger peak
                    if (signal[i] > signal[peaks[peaks.length - 1]]) {
                        peaks[peaks.length - 1] = i;
                    }
                    continue;
                }
            }

            peaks.push(i);
        }

        return peaks;
    }

    /**
     * Calculate RR intervals from detected peaks, then reject outliers
     * using median-based filtering.
     */
    calculateRRIntervals() {
        if (this.peaks.length < 2) return [];

        const intervals = [];
        for (let i = 1; i < this.peaks.length; i++) {
            const rr = this.filteredBuffer[this.peaks[i]].timestamp -
                       this.filteredBuffer[this.peaks[i - 1]].timestamp;

            // Validate: physiologically plausible (300ms–2000ms = 30–200 BPM)
            if (rr >= 300 && rr <= 2000) {
                intervals.push(rr);
            }
        }

        // Outlier rejection: remove intervals that deviate >25% from median
        if (intervals.length < 3) return intervals;

        const sorted = [...intervals].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const maxDev = this.config.maxRRDeviationFactor;

        return intervals.filter(rr => {
            const deviation = Math.abs(rr - median) / median;
            return deviation <= maxDev;
        });
    }

    /**
     * Calculate BPM from validated RR intervals.
     * Uses median (robust to remaining outliers) + exponential smoothing
     * for stable display output.
     */
    calculateBPM() {
        if (this.rrIntervals.length < this.config.minIntervalsForBPM) return 0;

        // Median of recent valid intervals
        const recent = this.rrIntervals.slice(-15);
        const sorted = [...recent].sort((a, b) => a - b);
        const medianRR = sorted[Math.floor(sorted.length / 2)];
        const instantBPM = Math.round(60000 / medianRR);

        // Clamp to physiological range
        const clamped = Math.max(this.config.minBPM, Math.min(this.config.maxBPM, instantBPM));

        // Exponential moving average for display stability
        if (this.smoothedBPM === 0) {
            this.smoothedBPM = clamped;
        } else {
            const alpha = this.config.bpmSmoothingAlpha;
            this.smoothedBPM += alpha * (clamped - this.smoothedBPM);
        }

        return Math.round(this.smoothedBPM);
    }

    /**
     * Calculate all HRV metrics from RR intervals.
     * Requires at least 5 valid RR intervals for meaningful results.
     */
    calculateHRV() {
        const rr = this.rrIntervals;

        if (rr.length < 5) {
            return null;
        }

        const n = rr.length;

        // Mean RR
        const meanRR = rr.reduce((a, b) => a + b, 0) / n;

        // SDNN — Standard Deviation of NN intervals
        const variance = rr.reduce((sum, val) => sum + Math.pow(val - meanRR, 2), 0) / (n - 1);
        const sdnn = Math.sqrt(variance);

        // RMSSD — Root Mean Square of Successive Differences
        let sumSquaredDiffs = 0;
        let successiveDiffs = [];
        for (let i = 0; i < n - 1; i++) {
            const diff = rr[i + 1] - rr[i];
            sumSquaredDiffs += diff * diff;
            successiveDiffs.push(Math.abs(diff));
        }
        const rmssd = Math.sqrt(sumSquaredDiffs / (n - 1));

        // pNN50 — Percentage of successive RR intervals differing by more than 50ms
        const nn50Count = successiveDiffs.filter(d => d > 50).length;
        const pnn50 = (nn50Count / successiveDiffs.length) * 100;

        // Mean HR
        const meanHR = Math.round(60000 / meanRR);

        return {
            meanRR: Math.round(meanRR),
            sdnn: Math.round(sdnn * 10) / 10,
            rmssd: Math.round(rmssd * 10) / 10,
            pnn50: Math.round(pnn50 * 10) / 10,
            meanHR,
            totalBeats: this.peaks.length,
            totalIntervals: n
        };
    }

    /**
     * Assess signal quality based on various heuristics.
     * Returns: { score: 0-100, label: string, details: string }
     */
    assessQuality() {
        const rr = this.rrIntervals;

        if (rr.length < 3) {
            return { score: 0, label: 'Insufficient', details: 'Not enough heartbeats detected' };
        }

        let score = 100;
        const issues = [];

        // Check 1: Enough data points
        if (rr.length < 10) {
            score -= 20;
            issues.push('Limited data points');
        }

        // Check 2: RR interval consistency (coefficient of variation)
        const meanRR = rr.reduce((a, b) => a + b, 0) / rr.length;
        const stdRR = Math.sqrt(rr.reduce((s, v) => s + Math.pow(v - meanRR, 2), 0) / rr.length);
        const cv = stdRR / meanRR;

        if (cv > 0.3) {
            score -= 30;
            issues.push('Irregular signal');
        } else if (cv > 0.2) {
            score -= 15;
            issues.push('Slightly irregular');
        }

        // Check 3: BPM in normal resting range
        const bpm = 60000 / meanRR;
        if (bpm < 40 || bpm > 180) {
            score -= 25;
            issues.push('Unusual heart rate');
        }

        // Check 4: Signal amplitude
        if (this.filteredBuffer.length > 0) {
            const vals = this.filteredBuffer.map(s => s.value);
            const ampRange = Math.max(...vals) - Math.min(...vals);
            if (ampRange < 0.5) {
                score -= 20;
                issues.push('Weak signal');
            }
        }

        score = Math.max(0, Math.min(100, score));

        let label;
        if (score >= 80) label = 'Excellent';
        else if (score >= 60) label = 'Good';
        else if (score >= 40) label = 'Fair';
        else label = 'Poor';

        return {
            score,
            label,
            details: issues.length > 0 ? issues.join(', ') : 'Strong, consistent signal'
        };
    }

    /**
     * Reset all buffers for a new measurement.
     */
    reset() {
        this.rawBuffer = [];
        this.filteredBuffer = [];
        this.peaks = [];
        this.rrIntervals = [];
        this.smoothedBPM = 0;
    }
}
