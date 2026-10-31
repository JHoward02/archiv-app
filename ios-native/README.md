# Archív iPhone sideload build

This is the iOS proof-of-concept for the existing Archív collection app.

- Source: `archiv-2-lego-staging`, without promoting staging website changes.
- CI workflow on `main`: `.github/workflows/archiv-ios.yml`.
- Bundle identifier: `app.archiv.collector`.
- The GitHub runner compiles a **device arm64 iOS application without a signing identity**, then zips `Payload/App.app` into an unsigned IPA.
- An unsigned IPA is **not directly installable**. AltStore Classic or a personal Xcode signing identity must sign it for an actual iPhone. Free Apple provisioning expires after 7 days.
- The IPA contains the same Archív catalog and the approved navy/gold brick icon as Android.
- Firebase Google authentication on iOS needs another registration in existing project `archiv-3f5df`. Add an **Apple/iOS app** with bundle ID `app.archiv.collector`, download `GoogleService-Info.plist`, and place it here as `ios-native/GoogleService-Info.plist`. The workflow then copies it into the Xcode app bundle and configures its `REVERSED_CLIENT_ID` URL scheme. **Do not invent or fabricate a plist.** Until provided, the IPA is a catalog/navigation preview, not a sign-in-ready build.
- iOS signing and TestFlight/App Store distribution can be addressed separately, once a developer membership or compatible signing setup is available.

Implementation reuses the Capacitor 7 web app, browser links and Firebase plugin. Native-specific CSS is injected only into this iOS build. Use Xcode for local debugging when available.
