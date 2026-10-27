import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

/**
 * ESP32 → backend telemetry ingest.
 * POST https://<deployment>.convex.cloud/telemetry
 * Body: { macAddress, batteryPercent?, signalDbm?, buttonPressed?, latitude?, longitude?, eventId?, beaconHardwareId? }
 */
const telemetryHandler = httpAction(async (ctx, request) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const b = (body ?? {}) as Record<string, unknown>;
    if (typeof b.macAddress !== "string" || !b.macAddress) {
      return new Response("macAddress is required", { status: 400 });
    }

    try {
      const result = await ctx.runMutation(api.beacons.ingestHardwareTelemetry, {
        macAddress: b.macAddress,
        batteryPercent:
          typeof b.batteryPercent === "number" ? b.batteryPercent : undefined,
        signalDbm: typeof b.signalDbm === "number" ? b.signalDbm : undefined,
        buttonPressed: Boolean(b.buttonPressed),
        latitude: typeof b.latitude === "number" ? b.latitude : undefined,
        longitude: typeof b.longitude === "number" ? b.longitude : undefined,
        eventId: typeof b.eventId === "string" ? b.eventId : undefined,
        beaconHardwareId:
          typeof b.beaconHardwareId === "string" ? b.beaconHardwareId : undefined,
      });
      return Response.json({ success: true, ...result });
    } catch (err) {
      return Response.json(
        {
          success: false,
          message: err instanceof Error ? err.message : "ingest failed",
        },
        { status: 500 }
      );
    }
  });

http.route({
  path: "/telemetry",
  method: "POST",
  handler: telemetryHandler,
});

export default http;
