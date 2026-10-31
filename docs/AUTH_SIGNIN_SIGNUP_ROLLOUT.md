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

## Signup message position and marketing preference
- The notice shown after an unregistered Google account attempts Sign in is displayed directly between the JOIN ARCHÍV kicker and the Create your Archív account heading.
- Signup includes an **unchecked optional** 'Email me Archív news and product updates' checkbox, with Not subscribed shown when unchecked.
- Only after an explicit newly-created sign-up does the app atomically persist name, email, firstSeen, lastSeen, and communicationsOptIn in collectorProfiles/{uid} under the already deployed owner-only rules. Existing accounts remain unchanged when they visit sign-up.
- The checkbox value is preserved across popup-blocked redirect via sessionStorage and cleared after completion. The same Firestore field is editable later from My profile.
- If the first-time Firestore profile write fails, the app attempts to delete the new Auth identity; failure is surfaced instead of silently losing the consent choice.
- Authenticated end-to-end preference persistence still needs disposable-account verification in the real staging Firebase project. Staging and production share Firebase, so never use a real account for destructive signup/deletion tests.

## Corrected signup notice and LEGO branding
- The registration page always shows a notice immediately between `JOIN ARCHÍV` and the heading. Direct sign-up visits show a truthful generic invitation; only a sign-in attempt with a newly provisioned Google identity shows the specific "No Archív account was found" message.
- The specific notice state is stored for the current tab in `sessionStorage` and persists through reload. It clears after successful authentication or a fresh sign-in attempt.
- The LEGO-specific logo is the existing `public/archiv-lego-logo.png` asset from `archiv-2-lego-staging`. It was omitted when the isolated branch was created, causing the image error fallback to load the old `logo4` (general-collectibles branding).
- `public/archiv-lego-logo.png` is now included verbatim; if it fails to load again, the app falls back to the text Archív and never displays the unrelated old logo.
- CI requires the LEGO logo asset and checks banner persistence. Validate the page in a real browser, not only via a CI build.
- The unchecked optional email preference remains directly on the signup page, and is saved to `collectorProfiles/{uid}.communicationsOptIn` on explicit registration.
