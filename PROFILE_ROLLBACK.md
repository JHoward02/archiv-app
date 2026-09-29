# Cloud profile rollout and rollback

- Pre-profile live checkpoint: `488d660570a368a848ee86a7f29c9a2e4515f9b8` (`checkpoint/pre-profiles-2026-09-28`).
- Profile implementation: `feature/cloud-profiles`; do not deploy it to `main` until Firebase is configured, rules are deployed, and a signed-in migration has been tested.
- To roll back the app, redeploy the pre-profile checkpoint. Do not delete Firebase records or the legacy browser collection. Cloud data remains available for a later retry.
- There is no legacy-record import. The app is unreleased; new accounts begin with empty cloud shelves. The pre-profile version remains recoverable independently.
- Firebase setup: create a web app, enable Google sign-in and Cloud Firestore, authorize the production domain, deploy `firestore.rules`, and set the four `VITE_FIREBASE_*` environment variables for the build. Use separate Firebase projects for staging and production.
- Uploaded item photos currently use data URLs within the item records. Large photos may exceed Firestore's document limit and need a separate image-storage migration before cloud profiles are released broadly.
