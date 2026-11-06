# Archív Android field test 0.1.0

Installable package: `com.archiv.fieldtest`. Label: **Archív Test**. Android 6.0+.

This is a browser-backed field-testing container for the live Archív app at https://jhoward02.github.io/archiv-app/. It requires internet and an enabled Android browser. A Custom Tab uses the device browser's Google sign-in and downloads/file chooser. If Custom Tabs are unavailable, the device's browser opens normally. This build does not bundle an offline copy of the web app and is not a Play Store production package. Approved live web changes appear without reinstalling this APK.

## Install and test

1. Download the APK on the Android device and open it.
2. If prompted, allow installation from the browser or Files app used to open the APK.
3. Install **Archív Test** and open it.
4. Sign in with Google. Check an existing collection or add a test item.
5. Test search, manual photo upload, groups, editing, export, and restore. Check cross-device syncing.
6. Report the phone model, Android version, browser, action attempted, and screenshot of any problem.

Closing the browser view returns to the small launcher screen. Tap Open your Archív to reopen. Uninstalling this APK does not delete your cloud account. Account deletion remains a separate confirmed action in Your profile.

## Build

Requires Android SDK Platform 36, Build Tools 36.0.0, Python with Pillow, and JDK 8+ (or Eclipse ECJ 3.38.0 plus a Java runtime).

```
ARCHIV_ANDROID_PLATFORM=/path/to/android-36/android.jar \
ARCHIV_ANDROID_TOOLS=/path/to/build-tools/36.0.0 \
ARCHIV_FIELD_KEYSTORE=/private/path/field-test.jks \
bash android-field-test/build.sh
```

If javac is unavailable, set `ARCHIV_ECJ=/path/to/ecj-3.38.0.jar`.
The build uses a dedicated field-test key (alias `archivfieldtest`, test password `android`). Keep this same key for updates to this test package. Generate a separate production key for a store release. Build outputs and keys are ignored by git.

Validation completed: Java compilation, DEX generation, APK packaging/alignment, v1/v2/v3 signature verification, manifest/package/SDK checks. Physical device installation and runtime behavior remain for field testing.
