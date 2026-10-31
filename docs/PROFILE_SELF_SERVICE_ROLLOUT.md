# Archív collector profiles and self-service account deletion
Status: staging-only implementation. **Do not enable in the shared Firebase project without owner approval.**

## Review environment
- Site: https://jhoward02.github.io/archiv-app/lego-preview/#/profile
- Sign in with Google via the header menu, then select **My profile**.
- The profile reads the signed-in user's Firebase Auth metadata, Cloud Firestore Owned/Wishlist collection, and the user's private `collectorProfiles/{uid}` document.
- Overview includes member-since, membership duration, last login, email, owned set count, count of owned themes, wishlist count, total stated pieces across owned sets, and five most-collected themes. Piece count totals catalog metadata, not a physical piece audit.
- Communication opt-in is an **explicit optional** preference. No consent is assumed by default. This feature only stores a boolean preference; no email-sending integration is installed.
- Deletion uses a separate confirmation panel requiring the text `DELETE` and Google reauthentication before any destructive changes.

## Staging and production isolation
Production is intentionally pinned to a separate source commit by the GitHub Pages workflow. Staging changes to `src/lego-entry.ts` and `src/lego-styles.css` must not be promoted automatically. Staging changes to `firestore.rules` are **repository-only**; GitHub Pages does not deploy Firestore rules.

The current shared Firebase rules do NOT allow users to delete `collectorProfiles`, `collectorSummaries`, or activity entries, and do NOT permit updating `communicationsOptIn`. To prevent broken or partial deletion, UI actions remain gated behind `VITE_PROFILE_BACKEND_READY=true`. Do not set that flag before the reviewed rules are independently deployed and audited.

## Firestore changes prepared but not deployed
- Allow account owners to store their own `communicationsOptIn` boolean on `collectorProfiles/{uid}`.
- Allow account owners to delete their own profile document, summary document, own activity documents, and their own adminAccess membership.
- Preserve admin-only list/read authority for all other users' private data.
- Existing deletion marker at `users/{uid}/account/deletion` blocks creation and updating of items/groups.
- Extend that tombstone block to profile, summary and activity writes so stale authenticated sessions cannot recreate account records after deletion. The UID-only marker remains indefinitely (until manual authorized cleanup) for that purpose.

## Self-delete sequence after backend approval
1. Show irreversible deletion warning. No action without user typing exact `DELETE` and choosing final deletion button.
2. Request fresh Google authentication: popup on web; native bridge Google credential on supported packaged Android/iOS.
3. Create UID-only deletion marker. Block future writes.
4. Delete all data documents under `users/{uid}/items`, `users/{uid}/groups`, `users/{uid}/activity` in batches of 200.
5. Delete `collectorSummaries/{uid}`, `collectorProfiles/{uid}`, and any `adminAccess/{uid}` grant.
6. Only after Firestore deletions succeed, delete the Firebase Authentication account.
7. Clear local `archiv-parts-checked:` checklists on that device and return to public catalog.
8. If an error occurs, explain that deletion may be incomplete and offer retry and getshelfiecollect@gmail.com. The deletion marker will block stale sessions and should not be removed without an intentional recovery process.

## Release and privacy gates
- First: owner reviews staging UI.
- Second: owner explicitly approves backend rules changes separately. The new rules affect both staging and production.
- Third: deploy rules through an authorized Firebase administration process, independently verify active rule version, and test on a new disposable account. Never use a real user account to test deletion.
- Fourth: enable `VITE_PROFILE_BACKEND_READY=true` in staging only; verify opt-in true/false persistence, account stats, invalid confirmation, fresh sign-in, one-account-only deletion, empty Firestore collections, revoked admin membership, and deleted Firebase Auth identity.
- Fifth: revise *production* Privacy Policy and Terms to describe the new optional opt-in, self-service deletion, retained UID-only deletion marker, and support fallback. **Do not edit staging legal HTML early**: current Pages workflow intentionally copies staging legal pages to production on every staging deployment.
- Sixth: obtain user approval on final staged UI and flow, then promote only reviewed app files and compatible legal pages to production.

## Known limitations
- No outbound marketing email system currently exists. Opt-in stores preference only.
- Firebase Auth token validity and concurrent requests require cautious tombstone handling; UID-only tombstone remains.
- A client-side multi-step deletion is not an atomic backend transaction. A partial failure requires retry or support. A dedicated authenticated backend operation would offer stronger guarantees but may add operational cost.
- Account preferences are private; only the signed-in owner and existing approved reporting administrators can read the profile.
- Deletion of Cloud Firestore and Auth does not delete the user's Google account, eBay account, provider backups, or external server logs.
- The code is staged; successful TypeScript compile and authenticated functional testing should be confirmed before enabling deletion.
