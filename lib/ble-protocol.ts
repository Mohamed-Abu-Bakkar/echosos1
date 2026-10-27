/**
 * EchoSOS BLE protocol
 *
 * Advertisement (manufacturer data) and GATT Event State share one compact
 * binary layout so identity/mode/event are not trusted from the local name
 * alone (names can be truncated and are not authentication).
 *
 * Manufacturer data layout (after company ID 0xE505):
 *   [0]     mode      uint8  'r' | 'e' | 'c'
 *   [1..4]  beaconId  uint32 big-endian
 *   [5..8]  eventId   uint32 big-endian (0 = no active event)
 *
 * GATT Event State characteristic payload (read / notify / write):
 *   [0]     mode      uint8  'r' | 'e' | 'c'
 *   [1..4]  beaconId  uint32 big-endian
 *   [5..8]  eventId   uint32 big-endian (0 = no active event)
 *   [9]     battery   uint8  0-100 (optional; 0xFF = unknown)
 *
 * Advertised local name remains a human-readable hint only:
 *   EchoSOS-r-<8 hex beaconId>
 *   EchoSOS-e-<8 hex beaconId>   (while SOS event active)
 *   EchoSOS-c-<8 hex beaconId>   (while cancelling / cancelled)
 */

export const BEACON_MODE = {
  registration: 'r',
  emergency: 'e',
  cancel: 'c',
} as const;

export type BeaconMode = (typeof BEACON_MODE)[keyof typeof BEACON_MODE];

export const MODE_PREFIX: Record<BeaconMode, string> = {
  r: 'EchoSOS-r-',
  e: 'EchoSOS-e-',
  c: 'EchoSOS-c-',
};

/** BLE company ID used in manufacturer data (0xE505). */
export const ECHOSOS_COMPANY_ID = 0xe505;

/** EchoSOS GATT service (short UUID 0xE505). */
export const ECHOSOS_SERVICE_UUID = '0000e505-0000-1000-8000-00805f9b34fb';

/** Readable Event State characteristic — primary source of truth for cancel. */
export const ECHOSOS_EVENT_STATE_CHAR_UUID =
  '0000e506-0000-1000-8000-00805f9b34fb';

export const EVENT_STATE_LENGTH = 10;
export const MANUFACTURER_PAYLOAD_LENGTH = 9;
export const BATTERY_UNKNOWN = 0xff;

export interface BeaconAdvertisement {
  mode: BeaconMode;
  beaconId: string;
  eventId: string | null;
  /** True when identity came from manufacturer data (preferred). */
  fromManufacturerData: boolean;
  /** True when only the local name matched (untrusted fallback). */
  fromLocalName: boolean;
  batteryPercent?: number;
}

export interface GattEventState {
  mode: BeaconMode;
  beaconId: string;
  eventId: string | null;
  batteryPercent?: number;
}

function isBeaconModeByte(value: number): boolean {
  return (
    value === BEACON_MODE.registration.charCodeAt(0) ||
    value === BEACON_MODE.emergency.charCodeAt(0) ||
    value === BEACON_MODE.cancel.charCodeAt(0)
  );
}

export function parseMode(value: number): BeaconMode | null {
  if (!isBeaconModeByte(value)) return null;
  return String.fromCharCode(value) as BeaconMode;
}

export function modeFromName(name: string | null | undefined): BeaconMode | null {
  if (!name) return null;
  if (name.startsWith(MODE_PREFIX.r)) return BEACON_MODE.registration;
  if (name.startsWith(MODE_PREFIX.e)) return BEACON_MODE.emergency;
  if (name.startsWith(MODE_PREFIX.c)) return BEACON_MODE.cancel;
  return null;
}

export function beaconIdFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  for (const mode of ['r', 'e', 'c'] as const) {
    const prefix = MODE_PREFIX[mode];
    if (name.startsWith(prefix)) {
      const suffix = name.slice(prefix.length);
      return /^[0-9a-fA-F]{1,8}$/.test(suffix)
        ? suffix.toLowerCase().padStart(8, '0')
        : null;
    }
  }
  return null;
}

/** 4-byte big-endian hex id ↔ display string (8 lowercase hex chars). */
export function bytesToId(bytes: Uint8Array, offset: number): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
  return view.getUint32(0, false)
    .toString(16)
    .padStart(8, '0');
}

export function idToBytes(id: string): Uint8Array {
  const numeric = parseInt(id, 16);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 0xffffffff) {
    throw new Error(`Invalid EchoSOS id: ${id}`);
  }
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, numeric, false);
  return out;
}

export type BleBinary = string | Uint8Array | ArrayBuffer | DataView;

function toUint8Array(data: BleBinary): Uint8Array | null {
  if (typeof data === 'string') {
    const hex = data.replace(/[^0-9a-fA-F]/g, '');
    if (hex.length < 2) return null;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof DataView) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return null;
}

/** Encode compact advertisement / GATT state payload. */
export function encodeBeaconState(
  mode: BeaconMode,
  beaconId: string,
  eventId?: string | null,
  batteryPercent?: number
): Uint8Array {
  const payload = new Uint8Array(EVENT_STATE_LENGTH);
  payload[0] = mode.charCodeAt(0);
  payload.set(idToBytes(beaconId), 1);
  payload.set(idToBytes(eventId || '00000000'), 5);
  payload[9] =
    batteryPercent === undefined || batteryPercent === null
      ? BATTERY_UNKNOWN
      : Math.max(0, Math.min(100, Math.round(batteryPercent)));
  return payload;
}

function decodeState(bytes: Uint8Array): GattEventState | null {
  if (bytes.length < MANUFACTURER_PAYLOAD_LENGTH) return null;
  const mode = parseMode(bytes[0]);
  if (!mode) return null;

  const beaconId = bytesToId(bytes, 1);
  const eventRaw = bytesToId(bytes, 5);
  const eventId = eventRaw === '00000000' ? null : eventRaw;

  const batteryPercent =
    bytes.length >= EVENT_STATE_LENGTH && bytes[9] !== BATTERY_UNKNOWN
      ? bytes[9]
      : undefined;

  return { mode, beaconId, eventId, batteryPercent };
}

/**
 * Decode manufacturer data for vendor 0xE505.
 * Accepts hex string, Uint8Array, ArrayBuffer, or DataView (Capacitor).
 */
export function decodeManufacturerData(
  vendorId: number,
  data: BleBinary
): GattEventState | null {
  if (vendorId !== ECHOSOS_COMPANY_ID) return null;
  const bytes = toUint8Array(data);
  if (!bytes || bytes.length < MANUFACTURER_PAYLOAD_LENGTH) return null;
  return decodeState(bytes);
}

/** Decode GATT Event State characteristic value. */
export function decodeGattEventState(data: BleBinary): GattEventState | null {
  const bytes = toUint8Array(data);
  if (!bytes) return null;
  return decodeState(bytes);
}

/**
 * Resolve beacon advertisement identity from scan fields.
 * Manufacturer data is authoritative when present; name is fallback only.
 */
export function resolveAdvertisement(
  name: string | null | undefined,
  manufacturerData?: Array<{ vendorId: number; data: BleBinary }>
): BeaconAdvertisement | null {
  const fromNameMode = modeFromName(name);
  const fromNameBeaconId = beaconIdFromName(name);

  if (manufacturerData) {
    for (const entry of manufacturerData) {
      const decoded = decodeManufacturerData(entry.vendorId, entry.data);
      if (decoded) {
        return {
          mode: decoded.mode,
          beaconId: decoded.beaconId,
          eventId: decoded.eventId,
          fromManufacturerData: true,
          fromLocalName: fromNameMode !== null,
          batteryPercent: decoded.batteryPercent,
        };
      }
    }
  }

  if (fromNameMode && fromNameBeaconId) {
    return {
      mode: fromNameMode,
      beaconId: fromNameBeaconId,
      eventId: null,
      fromManufacturerData: false,
      fromLocalName: true,
    };
  }

  return null;
}

export function buildBeaconLocalName(mode: BeaconMode, beaconId: string): string {
  return `${MODE_PREFIX[mode]}${beaconId}`;
}

/**
 * Compare GATT state against the event the app intends to cancel.
 * Returns ok=false when the device is reachable but the IDs disagree.
 */
export function verifyCancelTarget(
  state: GattEventState | null,
  expectedEventId: string,
  expectedBeaconId?: string | null
): { ok: boolean; reason?: string } {
  if (!state) {
    return { ok: false, reason: 'unreachable' };
  }
  if (state.mode !== BEACON_MODE.emergency && state.mode !== BEACON_MODE.cancel) {
    return { ok: false, reason: `mode:${state.mode}` };
  }
  if (!state.eventId) {
    return { ok: false, reason: 'no-event' };
  }
  if (state.eventId.toLowerCase() !== expectedEventId.toLowerCase()) {
    return { ok: false, reason: 'event-id-mismatch' };
  }
  if (
    expectedBeaconId &&
    state.beaconId.toLowerCase() !== expectedBeaconId.toLowerCase()
  ) {
    return { ok: false, reason: 'beacon-id-mismatch' };
  }
  return { ok: true };
}

/** Generate a unique 8-hex event id (fits compact BLE layout). */
export function generateEventId(): string {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Avoid all-zero which is reserved for "no event".
  if (bytes.every((b) => b === 0)) bytes[0] = 1;
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
