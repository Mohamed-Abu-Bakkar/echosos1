#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/android-common.sh"
load_android_config

VARIANT="${1:-debug}"
MODE="${2:-install}"
case "$VARIANT" in
  debug|release) ;;
  *)
    echo "Usage: $0 [debug|release] [install|build-only]" >&2
    exit 2
    ;;
esac
case "$MODE" in
  install|build-only) ;;
  *)
    echo "Usage: $0 [debug|release] [install|build-only]" >&2
    exit 2
    ;;
esac

if [[ "$VARIANT" == "release" ]]; then
  KEY_PROPERTIES_FILE="${ECHOSOS_KEY_PROPERTIES:-${ANDROID_KEY_PROPERTIES_FILE:-$HOME/.config/echosos/keystore.properties}}"
  if [[ ! -f "$KEY_PROPERTIES_FILE" ]]; then
    echo "Release signing is not configured." >&2
    echo "Run: ./scripts/create-keys.sh" >&2
    exit 1
  fi
  if [[ -z "$ANDROID_KEYSTORE_FILE" || ! -f "$ANDROID_KEYSTORE_FILE" ]]; then
    echo "Release keystore is missing. Run ./scripts/create-keys.sh or restore the saved key." >&2
    exit 1
  fi
  export ECHOSOS_KEY_PROPERTIES="$KEY_PROPERTIES_FILE"
fi

run_web_build
run_cap_sync

if [[ "$VARIANT" == "debug" ]]; then
  run_gradle_task :app:assembleDebug
  APK="$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
else
  run_gradle_task :app:assembleRelease
  APK="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
fi

if [[ ! -f "$APK" ]]; then
  echo "Gradle completed but expected APK was not found: $APK" >&2
  exit 1
fi

echo
echo "APK created: $APK"
if [[ "$MODE" == "install" ]]; then
  install_apk "$APK"
else
  echo "Build-only selected; phone was not modified."
fi
