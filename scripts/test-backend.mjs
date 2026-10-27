/* End-to-end test against live Convex deployment */
import { execFileSync } from "child_process";
import crypto from "crypto";

const URL = "https://cheerful-whale-489.convex.cloud";
const SECRET = "echosos_secure_super_secret_jwt_key_2026";
function hashPassword(p) {
  return crypto.createHash("sha256").update(p + SECRET).digest("hex");
}

function post(endpoint, path, args) {
  const out = execFileSync(
    "curl",
    [
      "-s",
      "-X",
      "POST",
      URL + "/api/" + endpoint,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({ path, format: "convex_encoded_json", args: [args] }),
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 }
  );
  try {
    const parsed = JSON.parse(out);
    return parsed.status === "success" ? parsed.value : parsed;
  } catch {
    return { _raw: out.slice(0, 200) };
  }
}
const q = (path, args) => post("query", path, args);
const m = (path, args) => post("mutation", path, args);

const assert = (cond, msg) => {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
};

(async () => {
  const phone = "+91 9990001" + Math.floor(Math.random() * 90000000 + 10000000);

  // 1. Register
  const reg = await m("users.js:createUser", {
    name: "Ada Lovelace",
    phone,
    passwordHash: hashPassword("secret123"),
  });
  assert(typeof reg === "string", "createUser returns id");
  const uidA = reg;

  // 2. Duplicate registration rejected
  const dup = await m("users.js:createUser", {
    name: "Ada",
    phone,
    passwordHash: "y".repeat(64),
  });
  assert(dup && dup.status === "error", "duplicate registration rejected");

  // 3. Login server-side
  const loginOk = await m("users.js:login", { phone, password: "secret123" });
  assert(loginOk.success === true, "login succeeds with correct password");
  assert(loginOk.user && loginOk.user._id === uidA, "login returns user");
  assert(loginOk.user.password_hash === undefined, "password_hash not exposed");

  const loginBad = await m("users.js:login", { phone, password: "wrong" });
  assert(loginBad.success === false, "login fails with wrong password");

  // 4. Public getUserByPhone strips hash
  const byPhone = await q("users.js:getUserByPhone", { phone });
  assert(byPhone && byPhone.password_hash === undefined, "getUserByPhone strips hash");

  // 5. Pair beacon
  const beacon = await m("beacons.js:pairBeacon", {
    userId: uidA,
    deviceName: "Ada-Beacon",
    macAddress: "AA:BB:CC:DD:EE:01",
    signalDbm: -45,
    batteryPercent: 90,
  });
  assert(beacon && beacon.device_name === "Ada-Beacon", "pairBeacon creates beacon");
  const bid = beacon._id;

  // 6. Get beacon
  const gb = await q("beacons.js:getBeacon", { userId: uidA });
  assert(gb && gb.device_name === "Ada-Beacon", "getBeacon returns paired beacon");
  assert(gb.battery_percent === 90, "beacon battery persisted");

  // 7. Contacts CRUD
  const c1 = await m("contacts.js:createContact", {
    userId: uidA,
    name: "Maya",
    phone: "+91 1111111111",
    relationship: "Mother",
    isPrimary: true,
  });
  const c2 = await m("contacts.js:createContact", {
    userId: uidA,
    name: "Rohan",
    phone: "+91 2222222222",
    relationship: "Father",
    isPrimary: false,
  });
  const contacts = await q("contacts.js:getContacts", { userId: uidA });
  assert(Array.isArray(contacts) && contacts.length === 2, "getContacts returns 2");
  assert(contacts.some((c) => c.name === "Maya" && c.is_primary === true), "Maya is primary");

  const upd = await m("contacts.js:updateContact", {
    userId: uidA,
    contactId: c2,
    name: "Rohan",
    isPrimary: true,
  });
  assert(upd && upd.name === "Rohan", "updateContact works");

  const contacts2 = await q("contacts.js:getContacts", { userId: uidA });
  const rohan = contacts2.find((c) => c.name === "Rohan");
  const maya2 = contacts2.find((c) => c.name === "Maya");
  assert(rohan && rohan.is_primary === true, "Rohan is primary after switch");
  assert(maya2 && maya2.is_primary === false, "Maya no longer primary");

  const del = await m("contacts.js:deleteContact", { userId: uidA, contactId: c2 });
  assert(del === true, "deleteContact works");
  const contacts3 = await q("contacts.js:getContacts", { userId: uidA });
  assert(contacts3.length === 1, "contact deleted");

  // cross-user contact access rejected
  const uidB = await m("users.js:createUser", {
    name: "Bob",
    phone: "+91 9990001" + Math.floor(Math.random() * 90000000 + 10000000),
    passwordHash: "z".repeat(64),
  });
  const steal = await m("contacts.js:deleteContact", {
    userId: uidB,
    contactId: contacts3[0]._id,
  });
  assert(steal && steal.status === "error", "other user cannot delete contact");

  // 8. Alerts
  const trig = await m("alerts.js:triggerAlert", {
    userId: uidA,
    latitude: 12.9716,
    longitude: 77.5946,
    beaconId: "AA:BB:CC:DD:EE:01",
  });
  assert(trig && trig.eventId, "triggerAlert creates event id");
  const eid = trig.eventId;

  const active = await q("alerts.js:getActiveAlert", { userId: uidA });
  assert(active && active.event_id === eid, "getActiveAlert returns the event");
  assert(active && active.latitude === 12.9716, "coordinates stored");

  // wrong event id → refused
  const badCancel = await m("alerts.js:cancelAlert", {
    userId: uidA,
    eventId: "deadbeef",
  });
  assert(
    badCancel.cancelled === false && badCancel.reason === "event-id-mismatch",
    "cancel with wrong event id refused"
  );

  // right event id → cancelled
  const goodCancel = await m("alerts.js:cancelAlert", {
    userId: uidA,
    eventId: eid,
    bleVerified: true,
  });
  assert(goodCancel.cancelled === true, "cancel with correct event id succeeds");
  const after = await q("alerts.js:getActiveAlert", { userId: uidA });
  assert(
    after && after.is_active === false && after.ble_mode === "c",
    "alert marked cancelled"
  );

  // 9. History
  const hist = await q("alerts.js:getAlertHistory", {
    userId: uidA,
    filter: "SOS",
  });
  assert(
    Array.isArray(hist) && hist.some((h) => h.event_type === "SOS_ALERT"),
    "history has SOS row"
  );

  // 10. Notifications
  const notifs = await q("notifications.js:getNotifications", { userId: uidA });
  assert(Array.isArray(notifs) && notifs.length >= 1, "notifications exist");
  const marked = await m("notifications.js:markAllNotificationsRead", { userId: uidA });
  assert(marked === true, "mark all read ok");

  // 11. Preferences
  const pref = await q("preferences.js:getPreferences", { userId: uidA });
  assert(pref && pref.dark_mode === false, "default preferences");
  const updPref = await m("preferences.js:updatePreferences", {
    userId: uidA,
    darkMode: true,
    language: "en-US",
  });
  assert(updPref && updPref.dark_mode === true, "preferences updated");

  // 12. Profile
  const prof = await q("users.js:getUserById", { userId: uidA });
  assert(prof && prof.name === "Ada Lovelace", "getUserById public");
  const updProf = await m("users.js:updateUserProfile", {
    userId: uidA,
    name: "Ada L.",
  });
  assert(updProf && updProf.name === "Ada L.", "profile updated");

  // 13. Hardware telemetry -> button press opens SOS (via the same ingestion
  // mutation the ESP32 calls over Convex HTTP)
  const tel = await m("beacons.js:ingestHardwareTelemetry", {
    macAddress: "AA:BB:CC:DD:EE:01",
    buttonPressed: true,
    batteryPercent: 88,
    signalDbm: -50,
    latitude: 19.076,
    longitude: 72.8777,
    eventId: "telemetr1",
  });
  assert(tel.alertTriggered === true, "button press triggered alert");

  const hwAlert = await q("alerts.js:getActiveAlert", { userId: uidA });
  assert(
    hwAlert && hwAlert.event_id === "telemetr1",
    "hardware-triggered alert is active with reported event id"
  );
  assert(hwAlert && hwAlert.latitude === 19.076, "hardware coordinates stored");

  // unknown MAC -> rejected
  const unknown = await m("beacons.js:ingestHardwareTelemetry", {
    macAddress: "00:00:00:00:00:00",
    buttonPressed: true,
  });
  assert(unknown.alertTriggered === false, "unknown beacon does not trigger alert");

  console.log("\nALL TESTS COMPLETE");
})();
