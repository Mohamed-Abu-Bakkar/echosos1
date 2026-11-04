#!/usr/bin/env bash
# Shared helpers for EchoSOS Android development scripts.
# This file is sourced by the scripts in this directory.

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/.echosos-android.env"
ANDROID_PACKAGE_ID="com.echosos.app"
ANDROID_DEVICE_SERIAL=""
ANDROID_KEYSTORE_FILE=""
ANDROID_KEY_ALIAS=""
ANDROID_KEY_PROPERTIES_FILE="${ECHOSOS_KEY_PROPERTIES:-$HOME/.config/echosos/keystore.properties}"

load_android_config() {
  [[ -f "$CONFIG_FILE" ]] || return 0
  while IFS='=' read -r key value || [[ -n "${key:-}" ]]; do
    case "${key:-}" in
      ANDROID_DEVICE_SERIAL) ANDROID_DEVICE_SERIAL="$value" ;;
      ANDROID_KEYSTORE_FILE) ANDROID_KEYSTORE_FILE="$value" ;;
      ANDROID_KEY_ALIAS) ANDROID_KEY_ALIAS="$value" ;;
      ANDROID_KEY_PROPERTIES_FILE) ANDROID_KEY_PROPERTIES_FILE="$value" ;;
      ANDROID_PACKAGE_ID) ANDROID_PACKAGE_ID="$value" ;;
    esac
  done < "$CONFIG_FILE"
}

save_android_config() {
  local key="$1"
  local value="$2"
  local tmp
  if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
    echo "Refusing to store a value containing a newline." >&2
    return 1
  fi
  mkdir -p "$(dirname "$CONFIG_FILE")"
  tmp="$(mktemp "${CONFIG_FILE}.XXXXXX")"
  if [[ -f "$CONFIG_FILE" ]]; then
    while IFS='=' read -r old_key old_value || [[ -n "${old_key:-}" ]]; do
      [[ "${old_key:-}" == "$key" ]] && continue
      printf '%s=%s\n' "$old_key" "${old_value:-}" >> "$tmp"
    done < "$CONFIG_FILE"
  fi
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$CONFIG_FILE"
}

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    return 1
  fi
}

ensure_adb() {
  if command -v adb >/dev/null 2>&1; then
    return 0
  fi
  local sdk=""
  sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  if [[ -n "$sdk" && -x "$sdk/platform-tools/adb" ]]; then
    export PATH="$sdk/platform-tools:$PATH"
    return 0
  fi
  echo "ADB was not found. On Ubuntu, install it with:" >&2
  echo "  sudo apt update && sudo apt install android-sdk-platform-tools" >&2
  echo "Then reconnect the phone and enable USB debugging." >&2
  return 1
}

detect_package_manager() {
  if command -v pnpm >/dev/null 2>&1; then
    PACKAGE_MANAGER="pnpm"
  elif command -v corepack >/dev/null 2>&1; then
    PACKAGE_MANAGER="corepack pnpm"
  elif command -v npm >/dev/null 2>&1; then
    PACKAGE_MANAGER="npm"
  else
    echo "Install Node.js and pnpm (recommended) or npm first." >&2
    return 1
  fi
}

ensure_node_dependencies() {
  if [[ -x "$ROOT_DIR/node_modules/.bin/next" ]]; then
    return 0
  fi
  detect_package_manager
  echo "Installing project dependencies with $PACKAGE_MANAGER..."
  if [[ "$PACKAGE_MANAGER" == "pnpm" ]]; then
    (cd "$ROOT_DIR" && pnpm install --frozen-lockfile)
  elif [[ "$PACKAGE_MANAGER" == "corepack pnpm" ]]; then
    (cd "$ROOT_DIR" && corepack pnpm install --frozen-lockfile)
  else
    (cd "$ROOT_DIR" && npm ci)
  fi
}

run_web_build() {
  ensure_node_dependencies
  detect_package_manager
  echo "Building EchoSOS web assets..."
  if [[ "$PACKAGE_MANAGER" == "pnpm" ]]; then
    (cd "$ROOT_DIR" && pnpm run build)
  elif [[ "$PACKAGE_MANAGER" == "corepack pnpm" ]]; then
    (cd "$ROOT_DIR" && corepack pnpm run build)
  else
    (cd "$ROOT_DIR" && npm run build)
  fi
}

run_cap_sync() {
  ensure_node_dependencies
  echo "Syncing Capacitor Android project..."
  if [[ -x "$ROOT_DIR/node_modules/.bin/cap" ]]; then
    (cd "$ROOT_DIR" && ./node_modules/.bin/cap sync android)
  elif command -v pnpm >/dev/null 2>&1; then
    (cd "$ROOT_DIR" && pnpm dlx @capacitor/cli@8.6.0 sync android)
  else
    need_command npx
    (cd "$ROOT_DIR" && npx --yes --package=@capacitor/cli@8.6.0 cap sync android)
  fi
}

run_gradle_task() {
  local task="$1"
  need_command java
  if [[ ! -f "$ROOT_DIR/android/gradlew" ]]; then
    echo "Gradle wrapper is missing: android/gradlew" >&2
    return 1
  fi
  echo "Running Gradle task: $task"
  if [[ -x "$ROOT_DIR/android/gradlew" ]]; then
    (cd "$ROOT_DIR/android" && ./gradlew "$task")
  else
    (cd "$ROOT_DIR/android" && bash ./gradlew "$task")
  fi
}

choose_android_device() {
  ensure_adb
  adb start-server >/dev/null
  local devices=()
  mapfile -t devices < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')

  if [[ "${#devices[@]}" -eq 0 ]]; then
    echo "No authorized Android device found." >&2
    echo >&2
    adb devices -l >&2
    echo >&2
    echo "On the phone: enable Developer options → USB debugging, reconnect it," >&2
    echo "unlock the screen, and accept the 'Allow USB debugging' RSA prompt." >&2
    return 1
  fi

  local selected=""
  local found_saved=false
  if [[ -n "$ANDROID_DEVICE_SERIAL" ]]; then
    local item
    for item in "${devices[@]}"; do
      if [[ "$item" == "$ANDROID_DEVICE_SERIAL" ]]; then
        found_saved=true
        break
      fi
    done
  fi

  if [[ "$found_saved" == true ]]; then
    selected="$ANDROID_DEVICE_SERIAL"
    echo "Using remembered phone: $selected" >&2
  elif [[ "${#devices[@]}" -eq 1 ]]; then
    selected="${devices[0]}"
    echo "Found phone: $selected" >&2
  else
    echo "Select the Android phone to use:"
    select selected in "${devices[@]}"; do
      if [[ -n "${selected:-}" ]]; then break; fi
      echo "Choose a valid number." >&2
    done
  fi

  [[ -n "$selected" ]] || return 1
  ANDROID_DEVICE_SERIAL="$selected"
  save_android_config ANDROID_DEVICE_SERIAL "$ANDROID_DEVICE_SERIAL"
  echo "Remembered device: $ANDROID_DEVICE_SERIAL" >&2
}

install_apk() {
  local apk="$1"
  if [[ ! -f "$apk" ]]; then
    echo "APK not found: $apk" >&2
    return 1
  fi
  choose_android_device
  echo "Installing $(basename "$apk") on $ANDROID_DEVICE_SERIAL..."
  adb -s "$ANDROID_DEVICE_SERIAL" install -r "$apk"
}
