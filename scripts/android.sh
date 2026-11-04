#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/android-common.sh"
load_android_config

show_memory() {
  echo "Saved local Android setup"
  echo "  Device serial : ${ANDROID_DEVICE_SERIAL:-not selected}"
  echo "  Package ID    : $ANDROID_PACKAGE_ID"
  echo "  Keystore      : ${ANDROID_KEYSTORE_FILE:-not created}"
  echo "  Key alias     : ${ANDROID_KEY_ALIAS:-not configured}"
  echo "  Key properties: ${ANDROID_KEY_PROPERTIES_FILE:-not configured}"
  echo
  echo "Memory file: $CONFIG_FILE"
  echo "Passwords are not stored in this file."
}

while true; do
  echo
  echo "======================================="
  echo "         EchoSOS Android Tools"
  echo "======================================="
  echo "Remembered phone: ${ANDROID_DEVICE_SERIAL:-none}"
  echo "Signing key:      ${ANDROID_KEY_ALIAS:-not configured}"
  echo
  select choice in \
    "Create release signing key" \
    "Set up / remember Android phone" \
    "Build debug APK" \
    "Build and install debug APK" \
    "Build release APK" \
    "Build and install release APK" \
    "Install existing release APK" \
    "Show saved setup" \
    "Forget remembered phone" \
    "Quit"; do
    case "$REPLY" in
      1) "$SCRIPT_DIR/create-keys.sh" ;;
      2) "$SCRIPT_DIR/setup-phone.sh" ;;
      3) "$SCRIPT_DIR/build-install.sh" debug build-only ;;
      4) "$SCRIPT_DIR/build-install.sh" debug install ;;
      5) "$SCRIPT_DIR/build-install.sh" release build-only ;;
      6) "$SCRIPT_DIR/build-install.sh" release install ;;
      7) "$SCRIPT_DIR/install-release.sh" ;;
      8) show_memory ;;
      9)
        save_android_config ANDROID_DEVICE_SERIAL ""
        ANDROID_DEVICE_SERIAL=""
        echo "Forgot the remembered phone. Other settings were preserved."
        ;;
      10) exit 0 ;;
      *) echo "Select a valid menu number." >&2; continue ;;
    esac
    load_android_config
    break
  done
done
