import { Capacitor, registerPlugin } from "@capacitor/core";

type NativeSmsResult = {
  acceptedByDevice: boolean;
  status: string;
};

type EchoSmsPlugin = {
  sendMessage(options: { phone: string; message: string }): Promise<NativeSmsResult>;
};

const EchoSms = registerPlugin<EchoSmsPlugin>("EchoSms");

export async function sendSmsThroughDevice(
  phone: string,
  message: string
): Promise<NativeSmsResult> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    throw new Error("Automatic SIM SMS is available only in the installed Android app.");
  }
  return EchoSms.sendMessage({ phone, message });
}
