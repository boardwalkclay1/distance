import { BleClient } from '@capacitor-community/bluetooth-le';

let currentMode = "board";

export function setMode(mode) {
  currentMode = mode;
  document.getElementById("status").innerText = `Mode: ${mode}`;
}

export async function scan() {
  document.getElementById("status").innerText = "Scanning...";

  await BleClient.initialize();

  await BleClient.requestLEScan({}, result => {
    if (result.device.name === "DistanceBeacon") {
      updateRSSI(result.rssi);
    }
  });

  setTimeout(() => {
    BleClient.stopLEScan();
  }, 5000);
}

function updateRSSI(rssi) {
  let message;

  if (rssi > -60) {
    message = currentMode === "board"
      ? "Board is right with you."
      : "Skates are right with you.";
  } else if (rssi > -70) {
    message = currentMode === "board"
      ? "Board is a few steps away."
      : "Skates drifting a bit.";
  } else if (rssi > -80) {
    message = currentMode === "board"
      ? "Board getting distant."
      : "Skates almost out of range.";
  } else {
    message = currentMode === "board"
      ? "Board out of range."
      : "Skates out of range.";
  }

  document.getElementById("status").innerText = `RSSI: ${rssi}\n${message}`;
}
