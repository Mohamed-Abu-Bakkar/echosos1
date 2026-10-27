/**
 * EchoSOS ESP32-S3 beacon firmware (reference integration).
 *
 * Protocol (must match app/lib/ble-protocol.ts):
 *
 * Advertisement manufacturer data (company ID 0xE505):
 *   [0]     mode      'r' | 'e' | 'c'
 *   [1..4]  beaconId  uint32 BE
 *   [5..8]  eventId   uint32 BE (0 = none)
 *
 * Local name (hint only, may be truncated):
 *   EchoSOS-r-<8 hex beaconId>
 *   EchoSOS-e-<8 hex beaconId>   while SOS active
 *   EchoSOS-c-<8 hex beaconId>   while cancelling
 *
 * GATT service 0000e505-0000-1000-8000-00805f9b34fb
 *   Characteristic 0000e506-... (Event State, READ|WRITE|NOTIFY):
 *     same 9-byte layout as manufacturer data + [9] battery percent
 *
 * Button press → mode 'e', new eventId, advertise EchoSOS-e-, notify Event State.
 * App cancel verification reads Event State and must see the same eventId.
 *
 * Requires: ESP32 Arduino core with NimBLE or Bluedroid BLE Arduino API.
 * This sketch uses the classic Arduino BLE library (ESP32 BLE).
 */

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <BLEAdvertising.h>

// --- Protocol constants (mirror lib/ble-protocol.ts) ---
static const uint16_t ECHOSOS_COMPANY_ID = 0xE505;
static const char *SERVICE_UUID = "0000e505-0000-1000-8000-00805f9b34fb";
static const char *EVENT_STATE_UUID = "0000e506-0000-1000-8000-00805f9b34fb";

static const char MODE_REG = 'r';
static const char MODE_EMERGENCY = 'e';
static const char MODE_CANCEL = 'c';

static const int BUTTON_PIN = 0; // adjust to board
static const int LED_PIN = 2;

uint32_t beaconId = 0;   // derive from MAC; set once in setup()
uint32_t eventId = 0;    // 0 = no active event
char activeMode = MODE_REG;

BLEServer *pServer = nullptr;
BLEService *pService = nullptr;
BLECharacteristic *pEventState = nullptr;
BLEAdvertising *pAdvertising = nullptr;

uint32_t generateEventId() {
  uint32_t id = esp_random();
  if (id == 0) id = 1;
  return id;
}

void fillStatePayload(uint8_t *out10) {
  out10[0] = (uint8_t)activeMode;
  out10[1] = (beaconId >> 24) & 0xFF;
  out10[2] = (beaconId >> 16) & 0xFF;
  out10[3] = (beaconId >> 8) & 0xFF;
  out10[4] = beaconId & 0xFF;
  out10[5] = (eventId >> 24) & 0xFF;
  out10[6] = (eventId >> 16) & 0xFF;
  out10[7] = (eventId >> 8) & 0xFF;
  out10[8] = eventId & 0xFF;
  out10[9] = 0xFF; // battery unknown; replace with ADC reading
}

String localNameForMode(char mode) {
  char buf[32];
  snprintf(buf, sizeof(buf), "EchoSOS-%c-%08X", mode, (unsigned)beaconId);
  return String(buf);
}

void applyAdvertising() {
  if (!pAdvertising) return;

  pAdvertising->stop();

  // Complete local name (hint only)
  String name = localNameForMode(activeMode);
  pAdvertising->setScanResponse(true);
  pAdvertising->setName(name.c_str());

  // Manufacturer data: company ID + 9-byte state
  uint8_t state[10];
  fillStatePayload(state);
  uint8_t mfg[2 + 9];
  mfg[0] = ECHOSOS_COMPANY_ID & 0xFF;
  mfg[1] = (ECHOSOS_COMPANY_ID >> 8) & 0xFF;
  memcpy(&mfg[2], state, 9);
  pAdvertising->setManufacturerData(std::string((char *)mfg, sizeof(mfg)));

  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  pAdvertising->start();
}

void notifyEventState() {
  if (!pEventState) return;
  uint8_t state[10];
  fillStatePayload(state);
  pEventState->setValue(state, 10);
  pEventState->notify();
}

class EventStateCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *chr) override {
    // App-triggered SOS may push an event id / mode into Event State.
    std::string value = chr->getValue();
    if (value.size() < 9) return;

    activeMode = (char)value[0];
    eventId = ((uint32_t)value[5] << 24) | ((uint32_t)value[6] << 16) |
              ((uint32_t)value[7] << 8) | (uint32_t)value[8];

    if (activeMode == MODE_CANCEL) {
      // Keep advertising cancel until the app/backend confirms, then fall back to 'r'.
      eventId = 0;
      activeMode = MODE_REG;
    }

    applyAdvertising();
    notifyEventState();

    // Hardware side-effect: report to backend if Wi-Fi is configured.
    // http POST /api/beacon/telemetry { macAddress, buttonPressed, eventId, ... }
  }
};

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);

  uint64_t mac = ESP.getEfuseMac();
  beaconId = (uint32_t)((mac >> 16) & 0xFFFFFFFF);
  if (beaconId == 0) beaconId = 1;

  activeMode = MODE_REG;
  eventId = 0;

  BLEDevice::init("EchoSOS");
  pServer = BLEDevice::createServer();
  pService = pServer->createService(SERVICE_UUID);

  pEventState = pService->createCharacteristic(
      EVENT_STATE_UUID,
      BLECharacteristic::PROPERTY_READ |
      BLECharacteristic::PROPERTY_WRITE |
      BLECharacteristic::PROPERTY_NOTIFY |
      BLECharacteristic::PROPERTY_INDICATE);
  pEventState->addDescriptor(new BLE2902());
  pEventState->setCallbacks(new EventStateCallbacks());

  uint8_t initial[10];
  fillStatePayload(initial);
  pEventState->setValue(initial, 10);

  pService->start();

  pAdvertising = BLEDevice::getAdvertising();
  applyAdvertising();
  BLEDevice::startAdvertising();
}

void loop() {
  static bool lastButton = false;
  bool pressed = digitalRead(BUTTON_PIN) == LOW;

  if (pressed && !lastButton) {
    delay(30); // debounce
    if (digitalRead(BUTTON_PIN) == LOW && activeMode != MODE_EMERGENCY) {
      activeMode = MODE_EMERGENCY;
      eventId = generateEventId();
      digitalWrite(LED_PIN, HIGH);
      applyAdvertising();
      notifyEventState();
      // Optionally POST eventId to /api/beacon/telemetry with buttonPressed=true
    }
  }

  // Long-press cancel on device (optional): hold 5s → mode 'c' then 'r'
  lastButton = pressed;

  if (activeMode == MODE_EMERGENCY) {
    digitalWrite(LED_PIN, (millis() / 250) % 2 == 0 ? HIGH : LOW);
  } else if (activeMode == MODE_REG) {
    digitalWrite(LED_PIN, (millis() / 1000) % 2 == 0 ? HIGH : LOW);
  }

  delay(10);
}
