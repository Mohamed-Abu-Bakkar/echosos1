package com.echosos.app;

import android.Manifest;
import android.telephony.SmsManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "EchoSms",
    permissions = {
        @Permission(alias = "sms", strings = { Manifest.permission.SEND_SMS })
    }
)
public class EchoSmsPlugin extends Plugin {
    @PluginMethod
    public void sendMessage(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
            return;
        }
        sendMessageNow(call);
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            sendMessageNow(call);
        } else {
            call.reject("SMS permission was denied. Emergency SMS was not sent.");
        }
    }

    private void sendMessageNow(PluginCall call) {
        String phone = call.getString("phone");
        String message = call.getString("message");
        if (phone == null || phone.trim().isEmpty() || message == null || message.trim().isEmpty()) {
            call.reject("A destination phone number and message are required.");
            return;
        }

        try {
            SmsManager manager = SmsManager.getDefault();
            java.util.ArrayList<String> parts = manager.divideMessage(message);
            if (parts.size() > 1) {
                manager.sendMultipartTextMessage(phone, null, parts, null, null);
            } else {
                manager.sendTextMessage(phone, null, message, null, null);
            }
            JSObject result = new JSObject();
            result.put("acceptedByDevice", true);
            result.put("status", "submitted");
            call.resolve(result);
        } catch (SecurityException error) {
            call.reject("Android denied SMS permission. Message was not submitted.", error);
        } catch (Exception error) {
            call.reject("Could not submit SMS through the device SIM.", error);
        }
    }
}
