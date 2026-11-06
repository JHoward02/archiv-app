#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${ARCHIV_ANDROID_PLATFORM:?Set ARCHIV_ANDROID_PLATFORM to the SDK android.jar}"
: "${ARCHIV_ANDROID_TOOLS:?Set ARCHIV_ANDROID_TOOLS to the SDK build-tools directory}"
ARCHIV_KEYSTORE="${ARCHIV_FIELD_KEYSTORE:-$PWD/.private/field-test.jks}"
mkdir -p build/classes build/dex .private
python3 make-icon.py
"$ARCHIV_ANDROID_TOOLS/aapt2" compile --dir res -o build/resources.zip
"$ARCHIV_ANDROID_TOOLS/aapt2" link -I "$ARCHIV_ANDROID_PLATFORM" --manifest AndroidManifest.xml -o build/unsigned.apk build/resources.zip
if command -v javac >/dev/null; then
  javac -source 8 -target 8 -encoding UTF-8 -bootclasspath "$ARCHIV_ANDROID_PLATFORM" -d build/classes src/com/archiv/fieldtest/MainActivity.java
else
  : "${ARCHIV_ECJ:?Set ARCHIV_ECJ to the Eclipse compiler jar when javac is unavailable}"
  java -jar "$ARCHIV_ECJ" -1.8 -encoding UTF-8 -proc:none -bootclasspath "$ARCHIV_ANDROID_PLATFORM" -d build/classes src/com/archiv/fieldtest/MainActivity.java
fi
python3 - <<'PYTHON'
from zipfile import ZipFile
from pathlib import Path
with ZipFile('build/classes.jar','w') as jar:
    for file in Path('build/classes').rglob('*.class'): jar.write(file,str(file.relative_to('build/classes')))
PYTHON
"$ARCHIV_ANDROID_TOOLS/d8" --min-api 23 --lib "$ARCHIV_ANDROID_PLATFORM" --output build/dex build/classes.jar
python3 - <<'PY'
from zipfile import ZipFile,ZIP_DEFLATED
with ZipFile('build/unsigned.apk','a') as apk:
    apk.write('build/dex/classes.dex','classes.dex',compress_type=ZIP_DEFLATED)
PY
"$ARCHIV_ANDROID_TOOLS/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
if [ ! -f "$ARCHIV_KEYSTORE" ]; then
  keytool -genkeypair -keystore "$ARCHIV_KEYSTORE" -storepass android -keypass android -alias archivfieldtest -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=Archiv Field Test, O=Archiv'
fi
"$ARCHIV_ANDROID_TOOLS/apksigner" sign --ks "$ARCHIV_KEYSTORE" --ks-pass pass:android --key-pass pass:android --ks-key-alias archivfieldtest --out build/archiv-field-test-0.1.0.apk build/aligned.apk
"$ARCHIV_ANDROID_TOOLS/apksigner" verify --verbose build/archiv-field-test-0.1.0.apk
"$ARCHIV_ANDROID_TOOLS/aapt2" dump badging build/archiv-field-test-0.1.0.apk
