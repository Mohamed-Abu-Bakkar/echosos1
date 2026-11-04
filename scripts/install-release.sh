#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/android-common.sh"
load_android_config

APK="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$APK" ]]; then
  echo "Release APK not found." >&2
  echo "Build and install one with: ./scripts/build-install.sh release" >&2
  exit 1
fi

install_apk "$APK"
