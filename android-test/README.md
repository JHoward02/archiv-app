# Archív Android test APK

This package installs an Archív icon on an Android phone and opens the **production Archív website** in Chrome Custom Tabs. Google sign-in runs in the supported browser and shares browser authentication. Internet access and a compatible browser are required. This is a lightweight Android test launcher, not an offline-native app.

## Build and install

GitHub Actions creates a debug APK in its **Archív Android test APK** workflow. Open the successful run, choose **Artifacts → archiv-android-test-apk**, download the ZIP, extract it, and install `app-debug.apk` on your Android device. Android may ask you to permit installations from your file manager. Do not give the APK to untrusted users; it's for private testing.

The launcher icon is generated from the **A-shaped LEGO shelf from the approved Archív logo**, using `public/archiv-lego-logo.png` as the source. A launcher crop is prepared during the GitHub build.

To package a standalone native app with its own Firebase-compatible OAuth redirect and fully native navigation later, we will need additional development.
