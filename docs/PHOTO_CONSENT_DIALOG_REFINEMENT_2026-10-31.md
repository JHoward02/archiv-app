# Photo upload consent dialog refinement

Date: October 31, 2026 (Pacific)
Scope: staging-only LEGO photo contribution dialog. Production remains pinned.

## Source of staged UI

The authoritative GitHub Pages workflow on `main` currently builds the isolated `/lego-preview/` from branch `feature/owned-set-photo-review-20261031`, not from this staging branch. The photo dialog wording and associated style were updated directly on that preview source branch:

- `src/lego-photo-ui.ts`: succinct optional community-review checkbox, policy links, no duplicate rights explanation or expanding license block.
- `src/lego-styles.css`: compact policy links.

The two documents already published in the staging preview provide the full detail:

- `public/terms.html#community-photos`
- `public/privacy.html#uploaded-photos`

The unchecked checkbox still stores a photo privately. Community review remains opt-in, with the same license-version and consent fields in Firestore. Approved photos may outlast account deletion, and removal requests remain available.

## Deployment / QA

This documentation-only commit on `archiv-2-lego-staging` triggers the existing GitHub Pages workflow, which will rebuild the isolated preview from the dedicated photo review branch. No production UI or production pin change was requested.

Verify the Pages build/deploy job succeeds, then verify `lego-preview/build-info.json` `source_commit` matches the photo review branch HEAD (not this documentation commit), and test the new dialog on an owned set. Do not imply a signed-in Firestore upload test occurred unless a real test account performed it.
