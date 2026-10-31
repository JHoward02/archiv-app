# Archív iPhone sideload build

This is the iOS proof-of-concept for the existing Archív collection app.

- Source: `archiv-2-lego-staging`, without promoting staging website changes.
- CI workflow on `main`: `.github/workflows/archiv-ios.yml`.
- Bundle identifier: `app.archiv.collector`.
- The GitHub runner compiles a **device arm64 iOS application without a signing identity**, then zips `Payload/App.app` into an unsigned IPA.
- An unsigned IPA is **not directly installable**. AltStore Classic or a personal Xcode signing identity must sign it for an actual iPhone. Free Apple provisioning expires after 7 days.
- The IPA contains the same Archív catalog and the approved navy/gold brick icon as Android.
- Firebase iOS registration is configured for existing project `archiv-3f5df` with the owner-provided `ios-native/GoogleService-Info.plist` and bundle ID `app.archiv.collector`. The macOS workflow installs `CapacitorFirebaseAuthentication/Google`, embeds Firebase configuration, registers the `REVERSED_CLIENT_ID` callback URL, and verifies it in the final IPA. Native Google sign-in is now compiled but requires a real iPhone test after signing the IPA.
- iOS signing and TestFlight/App Store distribution can be addressed separately, once a developer membership or compatible signing setup is available.

Implementation reuses the Capacitor 7 web app, browser links and Firebase plugin. Native-specific CSS is injected only into this iOS build. Use Xcode for local debugging when available.
