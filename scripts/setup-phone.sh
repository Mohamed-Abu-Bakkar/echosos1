#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/android-common.sh"
load_android_config

ensure_adb
adb start-server >/dev/null

echo "Connected Android devices:"
adb devices -l
echo
echo "If the phone is missing or shows 'unauthorized':"
echo "  1. Enable Developer options on Android."
echo "  2. Enable USB debugging."
echo "  3. Reconnect the cable, unlock the phone, and accept the RSA prompt."
echo

# Force a fresh selection when this setup command is called intentionally.
ANDROID_DEVICE_SERIAL=""
choose_android_device

echo
echo "Selected device: $ANDROID_DEVICE_SERIAL"
adb -s "$ANDROID_DEVICE_SERIAL" get-state
MODEL="$(adb -s "$ANDROID_DEVICE_SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
ANDROID_VERSION="$(adb -s "$ANDROID_DEVICE_SERIAL" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')"
echo "Phone model: ${MODEL:-Unknown}"
echo "Android version: ${ANDROID_VERSION:-Unknown}"
echo "Saved this phone selection in .echosos-android.env (git-ignored)."
