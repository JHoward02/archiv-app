# Archív Profile Release: Protected One-Pass Production Checklist

## Status
- Staging URL: https://jhoward02.github.io/archiv-app/lego-preview/#/profile
- User-confirmed: communications opt-in remains checked after refresh.
- User-confirmed: account deletion flow worked on the test account.
- Profile candidate CI workflow: `.github/workflows/profile-release-ci.yml`, no publishing permission.
- Prepared candidate branch: `release/collector-profile-web-20261031`.
- **Do not deploy without the owner's explicit final approval.**

## Source isolation
The candidate is based on the exact approved production app snapshot `cfd3562675c3503d466553918cd6a304256632fa`, not the full staging branch, which contains other native work.

The only release files to be promoted:
1. `src/lego-entry.ts`: collector profile route, account information, permission-backed opt-in, safe deletion flow.
2. `src/lego-styles.css`: profile styles appended to existing production styles.
3. `public/privacy.html`: disclosure of optional email preference, self-deletion, retained UID-only marker, and assistance.
4. `public/terms.html`: match profile controls and deletion.
5. `firestore.rules`: synchronize the separately published and user-confirmed live rules into the repository to prevent accidental rollback.

The branch-only check workflow `.github/workflows/profile-release-ci.yml` should **not** be promoted to the production workflow.

## Critical production workflow change, only after approval
Existing `main` workflow: `.github/workflows/pages.yml`. It generates preview and production catalogs separately, protects the catalog threshold, restores pinned application files, and copies old legal pages from staging.

After approval:
- Maintain the existing full Rebrickable import, 25,000+ sets, 128 inventory shards, and theme safeguards.
- Restore the production app files from the **verified, immutable candidate commit SHA**, not the changing staging branch or the original old pin.
- Set `VITE_PROFILE_BACKEND_READY=true` **for the production app build as well as staging**. Without this flag, the controls remain disabled.
- Copy the two approved legal HTML files from the immutable candidate commit, **not the staging legal pages**.
- Update the old grep guards that expect the superseded no-self-service privacy wording.
- Keep Impact-script removal and affiliate disclosure.
- Synchronize only the approved Firestore rules file to the repository; **do not** automatically run `firebase deploy` from Pages. Firebase rules were separately published in Console.
- Keep all unrelated native application work out of this web deployment.

## Final production verification
- GitHub Actions must succeed.
- Production home should show 145 navigation themes; City 1,020 sets; Star Wars 1,103 sets (catalog counts may change if the source CSV changes; verify a full catalog, not a specific stale number).
- Inline eBay commission disclosure must appear beside each shopping link.
- Signed-in account menu should contain My profile.
- Profile statistics, email, and most-collected themes reflect that account.
- Communications opt-in persists in Firestore after refresh.
- Delete profile requires exact DELETE and fresh Google sign-in; **never test irreversible deletion on a real user account**.
- In a disposable test account, verify Firebase Authentication removal, owner items/groups/activity/profile/summary removal, and minimal deletion marker retention.
- Check production legal pages actually reference self-service deletion and opt-in; verify user-visible links and legal wording.
- Verify staging and production remain separate and source provenance remains recorded in build-info.json.

## Rollback
- If code or UI breaks, return the production app source pin to `cfd3562675c3503d466553918cd6a304256632fa` and restore the previously approved production legal files, without undoing the live Firestore rules required for proper owner data access.
- Stop, investigate, and obtain approval for any further production deployment.
