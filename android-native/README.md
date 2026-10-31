# Archív: self-contained Android test app

This is a real Capacitor Android application, **not** a Chrome Custom Tab launcher. The app shell, catalog, theme art, and parts inventory are bundled into the APK. Remote set photographs, affiliate listings and live Firebase synchronization still need internet.

Build workflow: `.github/workflows/capacitor-android.yml`.

The build uses **the last approved deployed Pages artifact** as its catalog / parts-inventory source. It must not trigger another Rebrickable download.

## Native Google authentication

The source includes the Capacitor Firebase Authentication bridge. **Before native Google sign-in works**, register the Android app in Firebase (`app.archiv.collector`) and add the APK signing certificate SHA-1. Download the Android `google-services.json` after registering the SHA-1 fingerprint and update `android-native/google-services.json` on this staging branch. This Firebase client config contains public identifiers, not service-account credentials. The Android Gradle build applies the Google Services plugin to generate native resources. Do not upload or commit a Firebase service-account private key.

Testing without Firebase Android registration still allows browsing the bundled catalog. Authentication is NOT claimed to work until the Android registration and signed app are verified.

A stable Archív testing certificate is required for Google OAuth. GitHub Actions expects `ARCHIV_ANDROID_KEYSTORE_B64` (base64-encoded PKCS12 keystore) and `ARCHIV_ANDROID_KEYSTORE_PASSWORD` repository secrets. The signing alias is `archiv-test`. If secrets are absent, the APK still builds with an ephemeral debug key but Google sign-in is not considered configured. Keep the signing certificate private and backed up; never commit it. Once the SHA-1 and SHA-256 are registered, download the updated Firebase Android client config and rebuild.

## The launcher icon

The original user-approved A-frame image is stored in `android-test/a-frame-icon.webp.b64`. The icon-generator keeps 12 percent margins around the entire image, to protect the feet from cropping.
