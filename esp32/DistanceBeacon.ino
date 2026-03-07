/*
  DistanceBeacon – ESP32 BLE Proximity Beacon
  ============================================
  Broadcasts a BLE advertisement named "DistanceBeacon" so the
  Proximity Pulse app can detect it and measure signal strength
  (RSSI) to estimate how far away your board / skates are.

  Hardware: Any ESP32 board (WROOM, S3, C3, etc.)
  No internet required – BLE only.

  Upload steps:
  1. Install Arduino IDE + esp32 board package
     (Boards Manager URL: https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json)
  2. Select Tools → Board → "ESP32 Dev Module" (or your variant)
  3. Select the correct COM / USB port
  4. Upload this sketch
  5. The built-in LED (GPIO 2) blinks every 2 s to confirm it's running
*/

#include <BLEDevice.h>
#include <BLEAdvertising.h>
#include <BLEUtils.h>

// ── Configuration ──────────────────────────────────────────
// This name MUST match what main.js looks for: "DistanceBeacon"
static const char* BEACON_NAME = "DistanceBeacon";

// Advertising TX power – higher = stronger signal / shorter apparent distance
// Options: ESP_PWR_LVL_N12, N9, N6, N3, N0, P3, P6, P9
static const esp_power_level_t TX_POWER = ESP_PWR_LVL_P9;

// Status LED pin (built-in on most ESP32 dev boards)
static const int LED_PIN = 2;

// ── Setup ───────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  Serial.println("DistanceBeacon starting...");

  // Init BLE with our beacon name
  BLEDevice::init(BEACON_NAME);
  BLEDevice::setPower(TX_POWER);

  // Configure advertising
  BLEAdvertising* pAdv = BLEDevice::getAdvertising();

  BLEAdvertisementData advData;
  advData.setName(BEACON_NAME);
  advData.setFlags(0x06);           // BR/EDR not supported, LE general discoverable
  pAdv->setAdvertisementData(advData);

  // Scan response carries the full name so iOS / Android can read it
  BLEAdvertisementData scanResp;
  scanResp.setName(BEACON_NAME);
  pAdv->setScanResponseData(scanResp);

  pAdv->setMinPreferred(0x06);      // help iOS find the device faster
  pAdv->setMinPreferred(0x12);

  BLEDevice::startAdvertising();

  Serial.print("Broadcasting as: ");
  Serial.println(BEACON_NAME);
  Serial.println("Ready – open Proximity Pulse app and scan.");
}

// ── Loop ────────────────────────────────────────────────────
void loop() {
  // Blink LED every 2 s to show the beacon is alive
  digitalWrite(LED_PIN, HIGH);
  delay(100);
  digitalWrite(LED_PIN, LOW);
  delay(1900);
}
