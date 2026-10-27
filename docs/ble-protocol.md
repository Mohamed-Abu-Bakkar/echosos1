# EchoSOS BLE beacon protocol

Three agreed states:

| BLE prefix | App action | Backend action |
|---|---|---|
| `EchoSOS-r-` | Open discovery and registration flow | Register beacon after user confirmation |
| `EchoSOS-e-` | Detect and process an SOS event | Create an emergency event and initiate push + SMS |
| `EchoSOS-c-` | Match cancellation to the correct active event | Mark event cancelled and notify contacts |

## Advertisement payload (authoritative)

Local names can be truncated and are **not** authentication. Every advertisement
carries a compact manufacturer payload (company ID **0xE505**):

| Offset | Field | Size | Notes |
|---|---|---|---|
| 0 | mode | 1 | `'r'` / `'e'` / `'c'` |
| 1–4 | beaconId | 4 | uint32 big-endian |
| 5–8 | eventId | 4 | uint32 big-endian; `0` = no active event |

Local name remains a human-readable hint only:

- `EchoSOS-r-<8 hex beaconId>`
- `EchoSOS-e-<8 hex beaconId>` while SOS is active
- `EchoSOS-c-<8 hex beaconId>` while cancelling

## GATT Event State (cancel verification)

- Service: `0000e505-0000-1000-8000-00805f9b34fb`
- Characteristic: `0000e506-0000-1000-8000-00805f9b34fb` (READ | WRITE | NOTIFY)
- Payload: same 9 bytes as manufacturer data, plus battery percent at offset 9 (`0xFF` = unknown)

During cancellation the app:

1. Loads the open event’s `event_id` from the backend.
2. Connects over GATT and reads Event State when a native BLE stack is available.
3. Aborts if the beacon reports a different `event_id`.
4. Calls `alerts:cancelAlert` with that `event_id` (and `bleVerified` when GATT matched).
5. The backend rejects a cancel whose `eventId` does not match the active alert (`409`).

## Event IDs

Every SOS activation gets a unique 8-hex `event_id` (fits the compact BLE layout).
Hardware button presses should generate the id on the ESP32 and include it in both
the advertisement and `POST /api/beacon/telemetry` (`eventId`). App-triggered SOS
lets Convex generate the id; the phone may write it into Event State over GATT.

## Code map

- Shared codec: `lib/ble-protocol.ts`
- Scanner + GATT verify: `lib/ble-background-scanner.ts`
- Backend: `convex/alerts.ts`, `convex/beacons.ts`, `convex/schema.ts`
- Firmware reference: `firmware/EchoSOS_Beacon/EchoSOS_Beacon.ino`
