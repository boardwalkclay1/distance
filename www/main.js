/* ─────────────────────────────────────────────────────────
   Proximity Pulse – main.js
   Detects the ESP32 "DistanceBeacon" via BLE and alerts the
   user when their board / skates drift out of range.
   Works offline – no internet required.
───────────────────────────────────────────────────────── */

'use strict';

// ── State ──────────────────────────────────────────────────
let currentMode   = 'board';
let scanning      = false;
let lastAlertTime = 0;
let lastRSSI      = null;

// Min ms between repeated alert notifications (30 s)
const ALERT_COOLDOWN = 30_000;

// RSSI thresholds (dBm)
const THRESH = { NEAR: -60, CLOSE: -70, FAR: -80 };

// RSSI range for signal bar: -40 dBm (strongest) → 100 %, -90 dBm (weakest) → 0 %
const RSSI_MAX = -40;
const RSSI_MIN = -90;

// ── BLE availability helper ─────────────────────────────────
// In a real Capacitor build BleClient is injected. In a plain
// browser we fall back to Web Bluetooth so the UI still works.
function getBleClient() {
  if (typeof BleClient !== 'undefined') return BleClient;
  if (navigator.bluetooth)              return null; // handled separately
  return null;
}

// ── Mode toggle ─────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  document.getElementById('mode-board' ).classList.toggle('active', mode === 'board');
  document.getElementById('mode-skates').classList.toggle('active', mode === 'skates');
  if (lastRSSI !== null) updateUI(lastRSSI);
}

// ── Notification permission ─────────────────────────────────
function requestNotifications() {
  if (!('Notification' in window)) {
    showToast('Notifications not supported on this device', false);
    return;
  }
  if (Notification.permission === 'granted') {
    markNotifGranted();
    return;
  }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      markNotifGranted();
    } else {
      showToast('Notifications blocked – check browser settings', false);
    }
  });
}

function markNotifGranted() {
  const btn = document.getElementById('notifBtn');
  btn.textContent = '✅ Alerts Enabled';
  btn.classList.add('granted');
}

// Auto-mark if already granted on page load
if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
  document.addEventListener('DOMContentLoaded', markNotifGranted);
}

// ── Toast helper ────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, danger = false) {
  const el = document.getElementById('alertToast');
  el.textContent = msg;
  el.classList.toggle('danger', danger);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

// ── Push a system notification ──────────────────────────────
function fireNotification(title, body) {
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN) return;
  lastAlertTime = now;

  showToast(`🚨 ${body}`, true);

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    const svgIcon = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🪐</text></svg>'
    );
    new Notification(title, {
      body,
      icon: svgIcon,
      tag:  'proximity-alert',
    });
  }
}

// ── Update all UI elements from an RSSI value ───────────────
function updateUI(rssi) {
  lastRSSI = rssi;

  const ring    = document.getElementById('proximityRing');
  const icon    = document.getElementById('ringIcon');
  const text    = document.getElementById('statusText');
  const rssiEl  = document.getElementById('rssiValue');
  const bar     = document.getElementById('signalBar');
  const barPct  = document.getElementById('barPct');

  // Remove all level classes
  ring.classList.remove('near', 'close', 'far', 'lost');

  let level, message, iconChar;

  if (rssi > THRESH.NEAR) {
    level    = 'near';
    iconChar = currentMode === 'board' ? '🛹' : '⛸️';
    message  = currentMode === 'board'
      ? '✅ Board is right with you!'
      : '✅ Skates are right with you!';
  } else if (rssi > THRESH.CLOSE) {
    level    = 'close';
    iconChar = '⚠️';
    message  = currentMode === 'board'
      ? '⚠️ Board is a few steps away.'
      : '⚠️ Skates drifting a little.';
  } else if (rssi > THRESH.FAR) {
    level    = 'far';
    iconChar = '🔴';
    message  = currentMode === 'board'
      ? '🔴 Board is getting distant!'
      : '🔴 Skates almost out of range!';
    fireNotification(
      'Proximity Pulse',
      currentMode === 'board'
        ? 'Your board is getting distant – check behind you!'
        : 'Your skates are almost out of range!'
    );
  } else {
    level    = 'lost';
    iconChar = '❌';
    message  = currentMode === 'board'
      ? '❌ Board out of range – look for it now!'
      : '❌ Skates out of range!';
    fireNotification(
      '🚨 Proximity Pulse',
      currentMode === 'board'
        ? 'Board LEFT BEHIND – go back now!'
        : 'Skates are out of range!'
    );
  }

  ring.classList.add(level);
  icon.textContent  = iconChar;
  text.textContent  = message;
  rssiEl.textContent = `Signal: ${rssi} dBm`;

  // Signal bar: map RSSI_MIN (weakest) → 0 %  to  RSSI_MAX (strongest) → 100 %
  const pct = Math.round(Math.min(100, Math.max(0, (rssi - RSSI_MIN) / (RSSI_MAX - RSSI_MIN) * 100)));
  bar.style.width = `${pct}%`;
  bar.style.background = level === 'near'  ? 'linear-gradient(90deg,#059669,#34d399)' :
                         level === 'close' ? 'linear-gradient(90deg,#ca8a04,#facc15)' :
                         level === 'far'   ? 'linear-gradient(90deg,#c2410c,#f97316)' :
                                             'linear-gradient(90deg,#991b1b,#ef4444)';
  barPct.textContent = `${pct}%`;
}

// ── Scan toggle ─────────────────────────────────────────────
async function toggleScan() {
  if (scanning) {
    stopScan();
  } else {
    await startScan();
  }
}

async function startScan() {
  const btn = document.getElementById('scanBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="scan-pulse"></span>Scanning…';

  document.getElementById('statusText').textContent = 'Searching for DistanceBeacon…';
  document.getElementById('rssiValue').textContent  = '';

  try {
    const client = getBleClient();

    if (client) {
      // ── Capacitor BleClient path ─────────────────────────
      await client.initialize();
      scanning = true;

      await client.requestLEScan({}, result => {
        if (result.device && result.device.name === 'DistanceBeacon') {
          updateUI(result.rssi);
        }
      });

      btn.disabled = false;
      btn.innerHTML = '⏹ Stop Scanning';

    } else if (navigator.bluetooth) {
      // ── Web Bluetooth fallback (browser dev/test) ────────
      const device = await navigator.bluetooth.requestDevice({
        filters:           [{ name: 'DistanceBeacon' }],
        optionalServices:  [],
      });

      scanning = true;
      btn.disabled = false;
      btn.innerHTML = '⏹ Stop Scanning';

      document.getElementById('statusText').textContent =
        `Connected to ${device.name} – monitoring RSSI…`;

      // Web Bluetooth doesn't expose continuous RSSI scanning,
      // so we show connected state and demo a simulated reading.
      simulateRSSI();

    } else {
      throw new Error('Bluetooth not available on this device');
    }

  } catch (err) {
    scanning = false;
    btn.disabled = false;
    btn.innerHTML = '🔍 Scan for Beacon';
    document.getElementById('statusText').textContent =
      `Could not start scan: ${err.message}`;
    showToast(`Scan error: ${err.message}`, false);
  }
}

function stopScan() {
  scanning = false;
  const btn = document.getElementById('scanBtn');
  btn.innerHTML = '🔍 Scan for Beacon';

  const client = getBleClient();
  if (client) {
    client.stopLEScan().catch(() => {});
  }

  document.getElementById('statusText').textContent = 'Scan stopped.';
  document.getElementById('rssiValue').textContent  = '';
}

// ── RSSI demo / simulation (browser without real BLE) ───────
// Simulates a beacon that slowly drifts out of range so the
// full UI flow can be demoed in a desktop browser.
let _simTimer = null;
let _simRSSI  = -55;
let _simDir   = -1;

function simulateRSSI() {
  clearInterval(_simTimer);
  _simTimer = setInterval(() => {
    if (!scanning) { clearInterval(_simTimer); return; }

    _simRSSI += _simDir * (Math.random() * 3 + 1);
    if (_simRSSI < -92) { _simDir =  1; _simRSSI = -92; }
    if (_simRSSI > -45) { _simDir = -1; _simRSSI = -45; }

    updateUI(Math.round(_simRSSI));
  }, 1500);
}
