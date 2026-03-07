# Proximity Pulse 🪐

A **purple/blue space-themed** BLE proximity app that **notifies you when you leave your board (or skates) behind**. Works entirely offline – no internet required.

---

## Features

| Feature | Detail |
|---|---|
| 🛹 Board / ⛸️ Skates modes | Switch between tracking your skateboard or skates |
| 📶 Live RSSI display | Signal-strength bar updates in real time |
| 🔔 Push notifications | System + on-screen alert when the beacon drifts out of range |
| 🌌 Space theme | Purple, blue, and white UI with animated stars |
| ✈️ Fully offline | Service worker caches all assets; BLE needs no internet |
| 📟 ESP32 beacon | Tiny Arduino sketch turns any ESP32 into the proximity tag |

---

## Project structure

```
distance/
├── www/                   ← Web app (Capacitor webDir)
│   ├── index.html
│   ├── style.css
│   ├── main.js
│   └── sw.js              ← Service worker for offline caching
├── esp32/
│   └── DistanceBeacon.ino ← Arduino sketch for the ESP32 beacon
├── capacitor.config.json
└── package.json
```

---

## ESP32 Setup

1. Open **Arduino IDE** and install the ESP32 board package  
   (Boards Manager URL: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`)
2. Open `esp32/DistanceBeacon.ino`
3. Select **Tools → Board → ESP32 Dev Module** (or your variant)
4. Select the correct COM / USB port
5. Click **Upload**
6. The built-in LED blinks every 2 s to confirm the beacon is running

The ESP32 will continuously advertise itself as **"DistanceBeacon"** over BLE. No Wi-Fi or internet needed.

---

## App Setup (Capacitor mobile build)

```bash
npm install
npx cap add android   # or ios
npx cap sync
npx cap open android  # build and run in Android Studio
```

The app can also be opened directly in a browser (Chrome / Edge) for development – it will demo RSSI changes automatically if a real BLE device isn't connected.

---

## How it works

| RSSI (dBm) | Status | Colour |
|---|---|---|
| > −60 | Right with you ✅ | Green |
| −60 to −70 | A few steps away ⚠️ | Yellow |
| −70 to −80 | Getting distant 🔴 | Orange |
| < −80 | Out of range ❌ | Red + notification |

When the signal drops below **−70 dBm**, the app fires both an **on-screen toast** and a **system push notification** (if permission was granted) warning you that you're leaving your board behind.

---

## License

MIT

