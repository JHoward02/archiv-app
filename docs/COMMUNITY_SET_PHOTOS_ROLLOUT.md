# Archív community set photographs: launch checklist

Status: code and UI staged, backend NOT enabled. Keep `VITE_PHOTO_BACKEND_READY` unset until the checks below are complete. No user photographs should be accepted before permissions and disclosure are approved.

## Behavior

- On **Sets Owned**, each owned set has an **Upload photo** action.
- On a set's detail page, only signed-in owners see **Your set photograph** and **Upload or replace your photo**.
- The user may save a picture privately without community submission. Explicitly checking the opt-in checkbox creates a pending moderation submission.
- The photo is resized/re-encoded in the browser as a JPEG, limited to 340,000 characters of JPEG base64 (roughly 250 KB), with source EXIF/camera GPS metadata removed by canvas re-encoding.
- Admins with `adminAccess/{uid}.enabled == true` see the pending review queue on **Admin dashboard**. Each submission can be **Approve and publish** or **Reject**.
- Only approval copies the photo into `approvedSetPhotos/{setNumber}`, which is publicly readable. Public set-detail pages display the community photo with separate labeling. Catalog tiles continue using existing official catalog image URLs.
- A set can have one stored owner image per contributor and one currently published community photo per set. An approved photo may be replaced by a later approval for the same set.
- The contributor can remove their private photo and, if currently credited in the approved public document, withdraw that public copy. Admins can unpublish photos.
- Profile deletion removes the owner's saved photos and any published copy they currently own, before deleting the account.

## Storage choice and limitations

Version one stores small JPEG data in Cloud Firestore. This avoids Firebase Storage (currently requires Blaze) and doesn't require a separate image server. It is suitable for a low-volume proof of concept, **not a scalable photo CDN**. Firestore size, document-read cost, and quotas may make Firebase Storage or another object store a better long-term solution.

Collection paths:
- `users/{uid}/setPhotos/{setNumber}`: private data, image payload, timestamp and status.
- `approvedSetPhotos/{setNumber}`: administrator-approved image for public display. Includes contributor UID for revocation authorization; do not present this technical identifier in the UI.

## REQUIRED before setting VITE_PHOTO_BACKEND_READY=true

1. Have Archív's Firebase project administrator deploy the **reviewed** `firestore.rules` from this branch, without overwriting unrelated live rules.
2. Test these security rules using the Firebase Emulator Suite: unauthorized/no-login writes denied; another collector cannot retrieve a private photo; private photo unavailable to admin; a moderator can list only pending photos; the owner can only write private/pending; the owner must have a saved Owned set; only admin can write approved public documents; only the contributing owner or admin can delete the public copy. Confirm account deletion and re-authentication behavior.
3. Verify existing `adminAccess` provisioning. Do not grant moderator status from public client code.
4. Verify the pending `collectionGroup("setPhotos")` query works (create any collection-group index requested by Firestore).
5. Update and approve **Privacy Policy** and **Terms of Use** before enabling uploads on any public-facing route.
6. Test with separate collector/admin accounts: upload private, opt in, reject, approve, published view without sign-in, remove, re-upload, and delete profile. Confirm account photo consent never defaults to checked for first upload.
7. After QA, enable `VITE_PHOTO_BACKEND_READY=true` only for the specifically approved release and deploy through GitHub Pages. Recheck production `build-info.json` and site behavior.

### Suggested Privacy Policy update for legal review

> If you upload a photograph of a LEGO set, Archív resizes and converts it to a JPEG in your browser and stores it with your account identifier, the LEGO set number, submission status, and relevant timestamps in Firebase Firestore. The conversion removes embedded camera metadata such as GPS location. Your uploaded photo remains private to your account unless you explicitly submit it for community review. Submitted photographs can be viewed by authorized Archív moderators. If approved, a copy of the image is published for other visitors to see on that LEGO set's page, along with the set number and a technical contributor identifier. You can remove your own stored photograph and withdraw your currently published contribution. You can also contact Archív about removal. Photos are deleted during account deletion as described in the account controls.

### Suggested Terms of Use update for legal review

> You may only upload photographs that you own or have permission to use. By choosing to submit a photograph for community review, you grant Archív a non-exclusive, worldwide, royalty-free license to host, review, resize, reproduce, and display the submitted photograph in connection with the Archív catalog if approved. You retain your ownership of the photograph. You may withdraw an eligible published contribution through your account controls or request removal. Archív may reject or unpublish photos, including images that are unrelated to the set, contain personal information, are misleading, or infringe third-party rights. Submission does not guarantee publication.

The above is proposed language, not a substitute for legal review or an already-published policy.

## Outstanding limitations

- The new rules are present only in GitHub until separately deployed to Firebase.
- In staging, buttons are visible but intentionally disabled by default. Do not claim uploads work end-to-end until the Firebase rules and release feature flag are verified.
- Photos are currently displayed in the owned set section and, after approval, the set detail's community-photo section. They do not yet override catalog tile images.
- Moderation is manual; there is no automatic inappropriate-image detection or takedown automation.
