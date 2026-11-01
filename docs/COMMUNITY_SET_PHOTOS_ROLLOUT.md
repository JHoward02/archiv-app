# Archív community photographs: nonexclusive permission and removal requests

**Status:** Code and interface in staging. Uploads remain **disabled** (`VITE_PHOTO_BACKEND_READY=false`) until approved legal language and Firebase access rules are deployed and verified. Production continues to use its existing release and policies.

## Policy and product behavior

- **Photographers retain all copyright.** Archív never claims ownership of user-uploaded photos. Uploading a photo does not assign its copyright to Archív.
- **Private upload:** The user grants Archív only the operational permission needed to resize, store, and show the image in that user's own account. It is not submitted for public display.
- **Optional community permission:** The user explicitly checks **Submit for community review**. This grants Archív a **non-exclusive, worldwide, royalty-free, limited-purpose license** to store, resize, reproduce and display the photograph within the Archív catalog and related app features after approval. The photographer remains free to use/license the work elsewhere.
- **Review:** Photos are private until explicitly submitted and approved by an authorized moderator. Admins can reject or unpublish photos. An approved photo gets an independent public `communitySetPhotos/{photoId}` document without a name or UID and may remain in the catalog even after account deletion.
- **Removal requests:** An approved photo is eligible for removal on request. Each community gallery photo includes a **Request removal** mail link identifying the set and public photo ID. An Archív admin verifies the requester is the rights holder or their authorized representative before unpublishing. Admins may also unpublish for legal, privacy or content-moderation reasons. Requests are not fulfilled automatically by clicking the link, and website/email copies already cached elsewhere may persist temporarily.
- **Account deletion:** Deletes account-linked personal/private/pending/rejected photos and the contributor's account-linked working copies of approved photos. Independently approved public community photos stay available by default, **but can still be removed on request**. Restricted evidence of community-display permission may be retained for rights disputes and legitimate removal-request handling for an appropriate period, as disclosed in the Privacy Policy. Public documents contain no account IDs or personal names.
- **No retroactive re-licensing:** Don't automatically apply this policy to past uploads made under different terms. No photos are presently accepted by this disabled-by-default staged feature.

## Technical design

- `users/{uid}/setPhotos/{setNumber}`: private account photo, `status`, `communityConsent`, `licenseVersion`, `consentedAt`, and image. Uploaders may overwrite/delete personal copies. New uploads are owner-only and size-limited.
- `communitySetPhotos/{photoId}`: approved public image, LEGO set number, approval timestamp. Multiple photos per set, no public author UID or name. Only moderators may publish/unpublish. An account deletion does not delete these.
- `communityPhotoPermissions/{photoId}`: restricted record of the explicit permission (`ownerUid`, consent timestamp, license version, set, and approved photo ID). Moderators only; subject to a defined data-retention policy.
- `PHOTO_LICENSE_VERSION=archiv-community-photo-license-v1-2026-11-01`.
- Images are compressed/re-encoded locally as small JPEGs to remove embedded source EXIF, capped around 250KB. This low-volume Firestore prototype may eventually need a scalable object store.

## Proposed Terms of Use language (for review before publication)

**Uploaded photographs and community permission**

> You retain ownership of the copyright in photographs you upload to Archív. We do not claim ownership of your photos. You represent that you own the photograph or have the rights needed to upload it. You grant Archív permission to process, resize, store, and display a private upload to you as necessary to provide the photo feature.
>
> If you optionally select **Submit for community review**, you also grant Archív a non-exclusive, worldwide, royalty-free license to store, reproduce, resize, and display the photograph in Archív's community catalog and related app features if we approve it. You remain the copyright owner and may use or license your photo elsewhere. Archív may reject a submission or remove it for moderation, legal, or privacy reasons.
>
> An approved community photograph may remain publicly available after you delete your Archív account. You may request its removal at any time by emailing **getshelfiecollect@gmail.com** or using the **Request removal** link accompanying the photo. Include the LEGO set number or photo reference. We may request reasonable verification that you own the rights or are authorized to act for the rights holder. We will review removal requests and remove qualifying photographs from the Archív catalog. Removal may not immediately eliminate independently cached copies or prior lawful uses.

## Proposed Privacy Policy language (for review before publication)

> If you upload a LEGO set photo, we store a resized JPEG, the set identifier, the upload/review status, an account identifier, and, when you opt into community review, a record of your permission and its timestamp. We convert source photos to JPEG in your browser to strip embedded camera metadata such as GPS/EXIF. Photos saved privately are available only to you. Authorized reviewers may access photos you submit for community review.
>
> When approved, a separate photo copy is published in the shared Archív catalog. Its public record does not include your account name, email or UID. Approved community photos may remain after you delete your account. You retain copyright and can request removal of an approved photo by contacting **getshelfiecollect@gmail.com**; we may ask for reasonable proof of authorship or authorization.
>
> Account deletion removes your personal and unapproved photo records and account-linked working copies. Separately approved community photos are retained unless removed on request or for moderation reasons. We may retain limited nonpublic permission records associated with approved community photos for an appropriate period to document the permission provided and resolve copyright or removal disputes. Contact us to request access, removal, or clarification of data rights.

## Activation and security checklist

- [ ] Review/approve Terms and Privacy language, including request handling and consent record retention. Non-exclusive copyright licensing is supported by U.S. Copyright Office guidance; avoid describing any automatic copyright transfer.
- [ ] Publish the approved legal terms on Archív's production and relevant staging endpoints **before** any uploads are enabled.
- [ ] Deploy the reviewed `firestore.rules` to the intended Firebase project `archiv-3f5df`. A GitHub source file alone does not deploy Firebase rules.
- [ ] Run Firebase Emulator Suite policy tests: signed-in owner of Owned set uploads; cross-user reads/writes denied; unsigned reads denied for private photos; private records invisible to moderators except pending; only admin approves, publishes, unpublishes; public photo documents never carry identifying fields; permission records admin-only; account deletion cannot remove community photos.
- [ ] Confirm Firestore query indexes for pending `collectionGroup("setPhotos")` and set-filtered `communitySetPhotos`.
- [ ] Test two distinct collector accounts and a moderator: upload private, review opt-in default unchecked, pending approval, rejection, approved gallery, removal-email photo ID, admin unpublish, and account deletion retaining public approved photos. Also test that a verified request results in removal.
- [ ] Establish a workflow for removal-request identity verification, audit logging, actual deletion, and response time.
- [ ] Enable `VITE_PHOTO_BACKEND_READY=true` only in an explicitly approved staging build after security and legal tests. Keep production immutable until separately approved.

## Limitations

The uploader cannot directly erase already-approved community photos via account deletion; verified removal requests are processed by an admin. This prototype has no automated request intake or takedown SLA, so no guarantee should be made about exact processing time. Public photos may be externally cached. The app is not yet licensed to ingest user photos until the reviewed Terms and actual Firebase security rules are live. Non-exclusive license language should be reviewed for the regions where Archív is offered.

**References:** U.S. Copyright Office, Copyright Basics, Circular 1 (non-exclusive permission does not transfer ownership); `https://www.copyright.gov/what-is-copyright/`.
