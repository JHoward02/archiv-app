# Archív Google sign-in and sign-up route separation

## Problem
Both old buttons called the same `signInWithPopup`, which makes a first-time Firebase Authentication user automatically. The UI previously had no explicit registration path.

## Staged behavior
- Existing collectors: `Sign in with Google` retains the authenticated account and routes to `#/profile`.
- New Google account under Sign in: Firebase supplies `getAdditionalUserInfo(result).isNewUser`. The app immediately deletes the provisional Firebase identity, suppresses app-side `onAuthStateChanged` collection/profile writes while the result is being classified, and routes to `#/sign-up`.
- The `#/sign-up` page explains account creation and has an explicit `Create Archív account with Google` button.
- Sign up with a first-time Google identity accepts registration and opens `#/profile`. Returning users who click Sign up are recognized as existing and admitted without creating duplicates.
- Popup-blocked fallback uses `signInWithRedirect` with session-scoped intent, `getRedirectResult`, and an auth listener gate to avoid premature registration.
- If provisional account deletion fails, the app signs out, shows an explicit error and directs the visitor to contact support. Do not claim cleanup succeeded.
- Null/unknown `getAdditionalUserInfo` status rejects access rather than silently creating an account.

## Firebase caveat
Client-only Firebase Google OAuth creates a provisional Auth identity before a browser client can inspect `isNewUser`. Deleting it immediately enforces the product-level flow, but does **not** mathematically guarantee that no provisional identity was briefly created, especially if the browser closes mid-operation. Strict server-side prevention requires Identity Platform blocking functions and additional operational/billing setup. This implementation avoids added services.

## Validation
- Run npm check and the auth decision tests.
- Verify sign-in on an existing test account works and saved Owned/Wishlist data remain unchanged.
- Verify Sign in with a brand-new Google test account redirects to `#/sign-up`; verify no test identity remains in Firebase Authentication, and no `collectorProfiles`, `collectorSummaries`, or `users/{uid}` records are created.
- Verify Sign up on that page creates exactly one Firebase account and a collector profile, and signs in.
- Test a returning user's Sign up path, popup cancellation, browser Back, refresh of `#/sign-up`, and popup-blocked redirect when feasible.
- Do not delete production accounts or modify Firebase rules to test this.
- Confirm preview points to this branch and production remains pinned to the approved Profile release.
- Only deploy to production after final user approval.
