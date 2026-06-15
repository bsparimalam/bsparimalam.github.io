/**
 * Stride PWA — app.js
 * Tracks run/walk with GPS: distance, pace, speed, calories, route.
 */

'use strict';

// ── State ──────────────────────────────────────────────────────────
const state = {
  status: 'idle',       // 'idle' | 'active' | 'paused' | 'done'
  startTime: null,
  pauseStart: null,
  pausedMs: 0,
  elapsed: 0,           // ms since start (excluding pauses)
  watchId: null,
  positions: [],        // [{lat, lng, ts, accuracy}]
  distance: 0,          // metres
  speed: 0,             // m/s (current)
  avgSpeed: 0,          // m/s
  timerInterval: null,
  paceHistory: [],      // [{t, pace}] pace in sec/km
};

// ── DOM Refs ───────────────────────────────────────────────────────
const screens = {
  home:     document.getElementById('screen-home'),
  tracking: document.getElementById('screen-tracking'),
  summary:  document.getElementById('screen-summary'),
};
const el = {
  gpsStatus:     document.getElementById('gps-status'),
  gpsStatusText: document.getElementById('gps-status-text'),
  gpsDot:        document.querySelector('.gps-dot'),
  btnStart:      document.getElementById('btn-start'),
  trackTime:     document.getElementById('track-time'),
  btnStop:       document.getElementById('btn-stop'),
  btnPause:      document.getElementById('btn-pause'),
  metDist:       document.getElementById('metric-distance'),
  metPace:       document.getElementById('metric-pace'),
  metSpeed:      document.getElementById('metric-speed'),
  metCal:        document.getElementById('metric-calories'),
  // Summary
  sumTitle:      document.getElementById('summary-title'),
  sumDate:       document.getElementById('summary-date'),
  sumDist:       document.getElementById('sum-distance'),
  sumTime:       document.getElementById('sum-time'),
  sumPace:       document.getElementById('sum-pace'),
  sumSpeed:      document.getElementById('sum-speed'),
  sumCal:        document.getElementById('sum-calories'),
  btnNewRun:     document.getElementById('btn-new-run'),
  paceChart:     document.getElementById('pace-chart'),
  toast:         document.getElementById('toast'),
};

// ── Leaflet Maps ───────────────────────────────────────────────────
let liveMap = null, livePolyline = null, liveMarker = null;
let pathMap = null, pathPolyline = null;
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_OPT = { maxZoom: 19 };

// ── GPS Check on Load ──────────────────────────────────────────────
function checkGPS() {
  if (!('geolocation' in navigator)) {
    el.gpsStatusText.textContent = 'GPS not supported';
    el.gpsDot.classList.add('error');
    return;
  }
  el.gpsStatusText.textContent = 'Acquiring GPS…';
  navigator.geolocation.getCurrentPosition(
    () => {
      el.gpsStatusText.textContent = 'GPS ready';
      el.gpsDot.classList.add('ready');
    },
    (err) => {
      el.gpsStatusText.textContent = err.code === 1 ? 'GPS denied' : 'GPS unavailable';
      el.gpsDot.classList.add('error');
    },
    { timeout: 10000, maximumAge: 30000 }
  );
}

// ── Start ──────────────────────────────────────────────────────────
el.btnStart.addEventListener('click', startActivity);

function startActivity() {
  if (!('geolocation' in navigator)) {
    showToast('GPS not supported on this device.');
    return;
  }
  // Reset state
  Object.assign(state, {
    status: 'active',
    startTime: Date.now(),
    pauseStart: null,
    pausedMs: 0,
    elapsed: 0,
    positions: [],
    distance: 0,
    speed: 0,
    avgSpeed: 0,
    paceHistory: [],
  });

  showScreen('tracking');
  initLiveMap();
  startWatch();
  // Start timer last so startTime is accurate
  startTimer();
}

// ── Screen Transitions ─────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  // Invalidate map after transition
  if (name === 'tracking' && liveMap) setTimeout(() => liveMap.invalidateSize(), 400);
  if (name === 'summary' && pathMap) setTimeout(() => pathMap.invalidateSize(), 400);
}

// ── Timer ──────────────────────────────────────────────────────────
function startTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(tickTimer, 500);
}

function tickTimer() {
  if (state.status !== 'active') return;
  const now = Date.now();
  state.elapsed = now - state.startTime - state.pausedMs;
  el.trackTime.textContent = fmtDuration(state.elapsed);
  updateMetrics();
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

// ── GPS Watch ──────────────────────────────────────────────────────
function startWatch() {
  state.watchId = navigator.geolocation.watchPosition(onPosition, onGPSError, {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 15000,
  });
}

function stopWatch() {
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
}

function onPosition(pos) {
  if (state.status !== 'active') return;
  const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords;
  const ts = pos.timestamp;

  // Ignore very inaccurate fixes
  if (accuracy > 50 && state.positions.length > 0) return;

  const point = { lat, lng, ts, accuracy };

  if (state.positions.length > 0) {
    const prev = state.positions[state.positions.length - 1];
    const d = haversine(prev.lat, prev.lng, lat, lng);
    // Filter tiny jitter (< 2m)
    if (d < 2) {
      // Still update speed
      if (speed != null) state.speed = speed;
      return;
    }
    state.distance += d;
    if (speed != null) state.speed = speed;
  }

  state.positions.push(point);
  updateLiveMap(lat, lng);

  // Record pace snapshot every 10 positions
  if (state.positions.length % 5 === 0 && state.elapsed > 5000) {
    const paceSecPerKm = state.distance > 0
      ? (state.elapsed / 1000) / (state.distance / 1000)
      : 0;
    state.paceHistory.push({ t: state.elapsed, pace: paceSecPerKm });
  }
}

function onGPSError(err) {
  if (err.code === 1) showToast('GPS permission denied.');
  else showToast('GPS signal lost. Move to open area.');
}

// ── Metrics Update ─────────────────────────────────────────────────
function updateMetrics() {
  const distKm = state.distance / 1000;
  const elapsedSec = state.elapsed / 1000;
  const speedKmh = state.speed * 3.6;

  // Avg speed
  state.avgSpeed = elapsedSec > 0 ? state.distance / elapsedSec : 0;
  const avgSpeedKmh = state.avgSpeed * 3.6;

  // Pace (sec/km) using avg speed
  const paceSecPerKm = state.avgSpeed > 0.3 ? 1000 / state.avgSpeed : 0;
  const paceStr = paceSecPerKm > 0 ? fmtPace(paceSecPerKm) : '--:--';

  const weightKg = 70;
  const MET = 5; // neutral between walking and running
  const cal = Math.round((MET * weightKg * (elapsedSec / 3600)));

  el.metDist.textContent  = distKm.toFixed(2);
  el.metPace.textContent  = paceStr;
  el.metSpeed.textContent = speedKmh.toFixed(1);
  el.metCal.textContent   = cal;
}

// ── Pause / Resume ─────────────────────────────────────────────────
el.btnPause.addEventListener('click', togglePause);

function togglePause() {
  if (state.status === 'active') {
    state.status = 'paused';
    state.pauseStart = Date.now();
    el.btnPause.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      Resume`;
    el.btnPause.classList.add('paused');
    showToast('Paused');
  } else if (state.status === 'paused') {
    state.pausedMs += Date.now() - state.pauseStart;
    state.pauseStart = null;
    state.status = 'active';
    el.btnPause.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      Pause`;
    el.btnPause.classList.remove('paused');
    showToast('Resumed');
  }
}

// ── Stop ───────────────────────────────────────────────────────────
el.btnStop.addEventListener('click', stopActivity);

function stopActivity() {
  if (state.status === 'paused') {
    state.pausedMs += Date.now() - state.pauseStart;
  }
  state.status = 'done';
  stopTimer();
  stopWatch();
  showSummary();
}

// ── Summary ────────────────────────────────────────────────────────
function showSummary() {
  const distKm = state.distance / 1000;
  const elapsedSec = state.elapsed / 1000;
  const avgSpeedKmh = state.avgSpeed * 3.6;
  const paceSecPerKm = state.avgSpeed > 0.3 ? 1000 / state.avgSpeed : 0;

  const weightKg = 70;
  const MET = 5;
  const cal = Math.round(MET * weightKg * (elapsedSec / 3600));

  // Motivational title
  const titles = ['Great job! 🔥', 'Crushed it! 💪', 'Awesome effort! ⚡', 'Keep moving! 🌟'];
  el.sumTitle.textContent = titles[Math.floor(Math.random() * titles.length)];

  // Date
  el.sumDate.textContent = new Date().toLocaleString([], {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  el.sumDist.textContent  = distKm.toFixed(2);
  el.sumTime.textContent  = fmtDuration(state.elapsed);
  el.sumPace.textContent  = paceSecPerKm > 0 ? fmtPace(paceSecPerKm) : '--:--';
  el.sumSpeed.textContent = avgSpeedKmh.toFixed(1);
  el.sumCal.textContent   = cal;

  showScreen('summary');
  drawPaceChart();
  initPathMap();
}

// ── Pace Chart (Canvas) ────────────────────────────────────────────
function drawPaceChart() {
  const canvas = el.paceChart;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth - 32;
  const H = 120;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const data = state.paceHistory;

  if (data.length < 2) {
    ctx.fillStyle = 'rgba(139,154,181,0.5)';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Not enough data for chart', W / 2, H / 2);
    return;
  }

  const minPace = Math.min(...data.map(d => d.pace));
  const maxPace = Math.max(...data.map(d => d.pace));
  const range = maxPace - minPace || 1;
  const maxT = data[data.length - 1].t;

  const pad = { top: 10, right: 10, bottom: 24, left: 48 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  const px = t => pad.left + (t / maxT) * cw;
  // invert: lower pace is faster → draw at top
  const py = p => pad.top + ((p - minPace) / range) * ch;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * ch;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
  }

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
  grad.addColorStop(0, 'rgba(0,229,160,0.35)');
  grad.addColorStop(1, 'rgba(0,229,160,0.0)');
  ctx.beginPath();
  ctx.moveTo(px(data[0].t), py(data[0].pace));
  data.forEach(d => ctx.lineTo(px(d.t), py(d.pace)));
  ctx.lineTo(px(data[data.length - 1].t), pad.top + ch);
  ctx.lineTo(px(data[0].t), pad.top + ch);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(px(data[0].t), py(data[0].pace));
  data.forEach(d => ctx.lineTo(px(d.t), py(d.pace)));
  ctx.strokeStyle = '#00e5a0';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Y-axis labels (pace)
  ctx.fillStyle = 'rgba(139,154,181,0.7)';
  ctx.font = `11px Inter, sans-serif`;
  ctx.textAlign = 'right';
  const paceVals = [minPace, (minPace + maxPace) / 2, maxPace];
  paceVals.forEach(p => {
    ctx.fillText(fmtPace(p), pad.left - 4, py(p) + 4);
  });

  // X-axis labels (time)
  ctx.textAlign = 'center';
  ctx.fillText('Start', px(data[0].t), H - 4);
  ctx.fillText('Finish', px(data[data.length - 1].t), H - 4);
}

// ── Live Map ───────────────────────────────────────────────────────
function initLiveMap() {
  if (liveMap) { liveMap.remove(); liveMap = null; }
  liveMap = L.map('live-map', {
    zoomControl: true,
    attributionControl: false,
    dragging: true,
  });
  L.tileLayer(TILE_URL, TILE_OPT).addTo(liveMap);

  livePolyline = L.polyline([], {
    color: '#00e5a0',
    weight: 4,
    opacity: 0.85,
  }).addTo(liveMap);

  // Start at last known position or default
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    liveMap.setView([lat, lng], 16);
    liveMarker = L.circleMarker([lat, lng], {
      radius: 8, color: '#00e5a0', fillColor: '#00e5a0',
      fillOpacity: 1, weight: 2,
    }).addTo(liveMap);
  }, () => {
    liveMap.setView([0, 0], 2);
  }, { timeout: 5000, maximumAge: 30000 });
}

function updateLiveMap(lat, lng) {
  if (!liveMap) return;
  const ll = [lat, lng];
  livePolyline.addLatLng(ll);
  if (liveMarker) liveMarker.setLatLng(ll);
  else liveMarker = L.circleMarker(ll, {
    radius: 8, color: '#00e5a0', fillColor: '#00e5a0',
    fillOpacity: 1, weight: 2,
  }).addTo(liveMap);
  liveMap.panTo(ll);
}

// ── Path Map (Summary) ─────────────────────────────────────────────
function initPathMap() {
  if (pathMap) { pathMap.remove(); pathMap = null; }
  pathMap = L.map('path-map', {
    zoomControl: true,
    attributionControl: false,
  });
  L.tileLayer(TILE_URL, TILE_OPT).addTo(pathMap);

  if (state.positions.length === 0) {
    pathMap.setView([0, 0], 2);
    return;
  }

  const latlngs = state.positions.map(p => [p.lat, p.lng]);

  // Draw route
  pathPolyline = L.polyline(latlngs, {
    color: '#00e5a0',
    weight: 4,
    opacity: 0.9,
  }).addTo(pathMap);

  // Start marker
  L.circleMarker(latlngs[0], {
    radius: 10, color: '#00b4d8', fillColor: '#00b4d8', fillOpacity: 1, weight: 2,
  }).bindPopup('Start').addTo(pathMap);

  // End marker
  if (latlngs.length > 1) {
    L.circleMarker(latlngs[latlngs.length - 1], {
      radius: 10, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 1, weight: 2,
    }).bindPopup('Finish').addTo(pathMap);
  }

  pathMap.fitBounds(pathPolyline.getBounds(), { padding: [30, 30] });
}

// ── New Run ────────────────────────────────────────────────────────
el.btnNewRun.addEventListener('click', () => {
  state.status = 'idle';
  showScreen('home');
});

// ── Helpers ────────────────────────────────────────────────────────

/** Haversine distance in metres */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(d) { return d * Math.PI / 180; }

/** Format ms → HH:MM:SS */
function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [hh, mm, ss].map(n => String(n).padStart(2, '0')).join(':');
}

/** Format sec/km → MM:SS */
function fmtPace(secPerKm) {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/** Toast notification */
let toastTimer = null;
function showToast(msg, duration = 2500) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), duration);
}

// ── PWA Service Worker Registration ───────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('[Stride] SW registered'))
      .catch(err => console.warn('[Stride] SW error:', err));
  });
}

// ── Init ───────────────────────────────────────────────────────────
checkGPS();
