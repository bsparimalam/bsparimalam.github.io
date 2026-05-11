/**
 * signal.js — PPG Signal Processing Module
 * 
 * Handles filtering, peak detection, heart rate calculation,
 * and HRV metric computation from raw PPG signal data.
 */

export class SignalProcessor {
    constructor() {
        // Buffer for raw signal samples: { value, timestamp }
        this.rawBuffer = [];
        this.filteredBuffer = [];
        this.peaks = []; // indices into filteredBuffer
        this.rrIntervals = []; // ms between consecutive peaks

        // Configuration
        this.config = {
            // Bandpass filter range (BPM → Hz)
            minBPM: 40,
            maxBPM: 200,
            // Moving average window for smoothing
            smoothingWindow: 5,
            // Minimum peak distance in ms (caps at 200 BPM)
            minPeakDistanceMs: 300,
            // Adaptive threshold factor
            thresholdFactor: 0.6,
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
        const recent = this.rawBuffer.slice(-30);
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
     * Simple IIR bandpass filter (second-order Butterworth approximation).
     * Designed for real-time PPG in the 0.67–3.33 Hz range (40–200 BPM).
     */
    bandpassFilter(data, sampleRate) {
        const lowCut = this.config.minBPM / 60; // Hz
        const highCut = this.config.maxBPM / 60; // Hz

        // Normalize frequencies
        const dt = 1 / sampleRate;
        const rc_high = 1 / (2 * Math.PI * lowCut);
        const rc_low = 1 / (2 * Math.PI * highCut);
        const alpha_high = dt / (rc_high + dt);
        const alpha_low = rc_low / (rc_low + dt);

        // High-pass filter (removes DC offset and slow drift)
        const highPassed = new Array(data.length);
        highPassed[0] = 0;
        for (let i = 1; i < data.length; i++) {
            highPassed[i] = alpha_low * (highPassed[i - 1] + data[i] - data[i - 1]);
        }

        // Low-pass filter (removes high-frequency noise)
        const bandPassed = new Array(data.length);
        bandPassed[0] = highPassed[0];
        for (let i = 1; i < data.length; i++) {
            bandPassed[i] = bandPassed[i - 1] + alpha_high * (highPassed[i] - bandPassed[i - 1]);
        }

        return bandPassed;
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

        // Step 2: Bandpass filter
        const filtered = this.bandpassFilter(smoothed, sampleRate);

        this.filteredBuffer = filtered.map((v, i) => ({
            value: v,
            timestamp: timestamps[i]
        }));

        // Step 3: Detect peaks
        this.peaks = this.detectPeaks(filtered, timestamps);

        // Step 4: Calculate RR intervals
        this.rrIntervals = this.calculateRRIntervals();

        // Step 5: Calculate BPM
        const bpm = this.calculateBPM();

        return {
            filtered: this.filteredBuffer,
            peaks: this.peaks,
            bpm,
            rrIntervals: this.rrIntervals
        };
    }

    /**
     * Adaptive threshold peak detection.
     */
    detectPeaks(signal, timestamps) {
        if (signal.length < 10) return [];

        const peaks = [];

        // Calculate signal statistics for adaptive threshold
        const max = Math.max(...signal);
        const min = Math.min(...signal);
        const range = max - min;

        if (range < 0.001) return []; // No meaningful signal

        const threshold = min + range * this.config.thresholdFactor;
        const minDistMs = this.config.minPeakDistanceMs;

        // Find local maxima above threshold
        for (let i = 2; i < signal.length - 2; i++) {
            if (
                signal[i] > threshold &&
                signal[i] > signal[i - 1] &&
                signal[i] > signal[i - 2] &&
                signal[i] >= signal[i + 1] &&
                signal[i] >= signal[i + 2]
            ) {
                // Check minimum distance from last peak
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
        }

        return peaks;
    }

    /**
     * Calculate RR intervals from detected peaks.
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

        return intervals;
    }

    /**
     * Calculate BPM from RR intervals.
     */
    calculateBPM() {
        if (this.rrIntervals.length < 2) return 0;

        // Use the most recent intervals for responsiveness
        const recent = this.rrIntervals.slice(-10);
        const meanRR = recent.reduce((a, b) => a + b, 0) / recent.length;
        return Math.round(60000 / meanRR);
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
    }
}
