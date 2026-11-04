#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/android-common.sh"
load_android_config

need_command keytool
need_command python3

KEYSTORE_DIR="$ROOT_DIR/android/keystores"
KEYSTORE_FILE="${ANDROID_KEYSTORE_FILE:-$KEYSTORE_DIR/echosos-release.jks}"
KEY_ALIAS="${ANDROID_KEY_ALIAS:-echosos-release}"
KEY_PROPERTIES_FILE="${ECHOSOS_KEY_PROPERTIES:-$HOME/.config/echosos/keystore.properties}"

mkdir -p "$KEYSTORE_DIR" "$(dirname "$KEY_PROPERTIES_FILE")"
chmod 700 "$KEYSTORE_DIR" "$(dirname "$KEY_PROPERTIES_FILE")"

if [[ -e "$KEYSTORE_FILE" || -e "$KEY_PROPERTIES_FILE" ]]; then
  echo "Signing material already exists; refusing to overwrite it." >&2
  echo "Keystore: $KEYSTORE_FILE" >&2
  echo "Gradle properties: $KEY_PROPERTIES_FILE" >&2
  echo "Back up the existing signing key before replacing anything." >&2
  exit 1
fi

echo "Creating the EchoSOS Android release signing key."
echo "The key file will stay in android/keystores/ (git-ignored)."
echo "Gradle passwords will be stored outside the repository with mode 600."
echo
echo "Use a strong password. At the key-password prompt, press Enter to reuse"
echo "the keystore password, or enter a separate password and remember it."
echo

keytool -genkeypair -v \
  -keystore "$KEYSTORE_FILE" \
  -storetype JKS \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=EchoSOS Android Release, OU=Mobile, O=EchoSOS, L=Trichy, ST=Tamil Nadu, C=IN"

echo
echo "Re-enter the passwords you just supplied to keytool so Gradle can sign releases."
read -r -s -p "Keystore password: " STORE_PASSWORD
printf '\n'
read -r -s -p "Key password (same as keystore if you pressed Enter above): " KEY_PASSWORD
printf '\n'

if [[ -z "$STORE_PASSWORD" || -z "$KEY_PASSWORD" ]]; then
  echo "Passwords cannot be empty. The keystore was created but Gradle signing was not configured." >&2
  echo "Run this script again after moving/removing the incomplete keystore, or configure the properties file manually." >&2
  exit 1
fi

ECHOSOS_KEYSTORE_PATH="$KEYSTORE_FILE" \
ECHOSOS_KEY_ALIAS="$KEY_ALIAS" \
ECHOSOS_STORE_PASSWORD="$STORE_PASSWORD" \
ECHOSOS_KEY_PASSWORD="$KEY_PASSWORD" \
ECHOSOS_PROPERTIES_FILE="$KEY_PROPERTIES_FILE" \
python3 <<'PY'
import os
from pathlib import Path

def escape(value: str) -> str:
    result = []
    for index, char in enumerate(value):
        if char == "\\":
            result.append("\\\\")
        elif char == "\n":
            result.append("\\n")
        elif char == "\r":
            result.append("\\r")
        elif char == "\t":
            result.append("\\t")
        elif char == " " and index == 0:
            result.append("\\ ")
        elif char in "!=:#" and index == 0:
            result.append("\\" + char)
        else:
            result.append(char)
    return "".join(result)

properties = {
    "storeFile": os.environ["ECHOSOS_KEYSTORE_PATH"],
    "storePassword": os.environ["ECHOSOS_STORE_PASSWORD"],
    "keyAlias": os.environ["ECHOSOS_KEY_ALIAS"],
    "keyPassword": os.environ["ECHOSOS_KEY_PASSWORD"],
}
path = Path(os.environ["ECHOSOS_PROPERTIES_FILE"]).expanduser()
path.parent.mkdir(parents=True, exist_ok=True)
contents = "".join(f"{key}={escape(value)}\n" for key, value in properties.items())
path.write_text(contents, encoding="utf-8")
path.chmod(0o600)
PY

unset STORE_PASSWORD KEY_PASSWORD
save_android_config ANDROID_KEYSTORE_FILE "$KEYSTORE_FILE"
save_android_config ANDROID_KEY_ALIAS "$KEY_ALIAS"
save_android_config ANDROID_KEY_PROPERTIES_FILE "$KEY_PROPERTIES_FILE"

echo
echo "Release signing configured."
echo "Keystore: $KEYSTORE_FILE"
echo "Gradle properties: $KEY_PROPERTIES_FILE"
echo "Keep secure backups of both files. Losing the signing key prevents updates"
echo "to apps distributed with that key."
