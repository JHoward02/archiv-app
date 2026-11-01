# Archív community photographs: ownership, retention, moderation, and launch

**Status:** Staging code only. `VITE_PHOTO_BACKEND_READY` stays **false**, and no photo uploads are authorized. The updated `firestore.rules` in this branch are **NOT DEPLOYED**. Legal terms and Firebase authorization must be reviewed and activated separately.

## Invariants requested by the product owner

1. **All uploads:** On every new photo upload, the contributor must affirm that they own the photo's copyright and execute a distinct, written electronic copyright assignment in favor of the legally identified owner/operator of Archív. This applies to private photos as well as photos submitted to community review. A blanket website Terms statement is **not** sufficient.
2. **Separate community choice:** Copyright assignment is mandatory for saving any uploaded photo. Submission to community review is a different, optional checkbox. Private means invisible to other collectors, not that the copyright remains with the uploader.
3. **Moderation:** Pending photos are visible only to their uploader and authorized reviewers. Moderation must approve a submission before any public community photo is created.
4. **Permanent community content:** Each approved photograph becomes an independent `communitySetPhotos/{photoId}` catalog asset. Multiple approved photos may coexist for the same set. Approved community photographs remain displayed after account deletion and are never deleted merely because the contributor removes their private copy, withdraws a pending submission, or deletes their account.
5. **Account deletion:** Remove all private, pending, rejected, and account-linked photo copies from `users/{uid}/setPhotos`. This includes redundant working copies of approved photos, but the **independent approved community originals are retained**. Retain a restricted copyright assignment audit record for each approved photo, containing the verified account UID, signed name, timestamp, assignment version, and photo ID. This is a legal-document retention exception to ordinary account erasure.
6. **Administrators:** Authorized moderators can unpublish community photos for legal, safety, or policy reasons. Account deletion is **not** a reason to unpublish an approved photo.
7. **No retroactive assertion:** No upload created before the signed assignment agreement may be treated as Archív-owned on this basis alone.

## Legal requirements (United States)

- **17 U.S.C. § 204(a)** requires a transfer of copyright ownership to be in writing and signed by the rights holder (or authorized agent). Draft language, an unchecked box, or a routine ToS amendment cannot establish retroactive ownership. Electronic-signature enforceability, assent evidence, minors, international users, and transfer termination rights need counsel review.
- The agreement must name **the actual legal entity/person receiving the copyright**, not only the Archív trade name. This is a launch blocker; replace the draft phrase `the legal operator of Archív` with the verified legal name.
- The photographer must own the rights being assigned, and cannot transfer copyrights of other people or underlying third-party designs. Rights in LEGO artwork, branding, and products are not acquired.
- Confirm whether separate author moral rights or privacy/publicity consents are required for your operating jurisdictions. A copyright transfer does not automatically give rights in recognizable people or private surroundings.

## Proposed Terms of Use addition (for legal review, NOT live yet)

**User-submitted photographs and copyright assignment.**

> Only upload photographs for which you personally own the copyright and have authority to transfer those rights. Each photograph requires a separate signed copyright-assignment agreement before Archív will store it. By checking the assignment confirmation, typing your full legal name as your electronic signature, and submitting the photograph, you assign and transfer to **[INSERT LEGAL NAME OF ARCHÍV OPERATOR]** all copyright rights that you own in the uploaded photograph, worldwide, for the full remaining copyright term, subject to applicable law. No payment is due for the transfer unless separately agreed in writing. This transfer applies whether the photo is kept private or submitted for community review and remains effective after you remove your account-linked photo or delete your account. You are not transferring rights in underlying third-party trademarks, LEGO products, or copyrighted artwork that you do not own.
>
> Saving a photo privately does **not** submit it to the public community catalog. To propose a photo for publication, separately select the optional **Submit for community review** checkbox. Archív can reject or unpublish contributions. Once Archív approves and publishes a community photo, it becomes an independently retained Archív catalog asset. Approved community photos are not deleted merely because you later remove your private copy or delete your account. Private, pending, and rejected account photos are deleted with your account. You may request removal of published material for applicable legal reasons, and Archív may remove community photos at its discretion.

**Electronic assignment evidence (technical):** Store a versioned statement/agreement ID, affirmative checkbox, typed full legal name, authenticated Firebase UID, server-verified timestamp where feasible, and photo identifier/fingerprint. Prior to release, have counsel approve the actual signature procedure and evidence/retention policy. Present the complete assignment before signing.

## Proposed Privacy Policy addition (for legal review, NOT live yet)

> When you upload a set photograph, Archív resizes it into a small JPEG in your browser, which removes embedded source camera metadata such as GPS/EXIF. We store the JPEG, LEGO set identifier, upload/review status, account identifier, and the details of your signed copyright-assignment agreement (including your typed legal name, acceptance time, and agreement version). Photos saved without opting into community review are private to your account. Pending submissions are accessible to authorized Archív moderators.
>
> After a moderator approves a community photograph, a separate copy is published in the community LEGO catalog and can be viewed by all visitors. That approved photo remains in the catalog after you delete your account. Public community photo records are not labeled with your account ID or signature. When you delete your account, we erase private and unapproved photos and account-linked copies. We retain approved public community photographs and restricted copyright assignment records, including identifying signature information, to document copyright ownership and respond to disputes. These audit records are accessible only to authorized administrators and retained for the legally appropriate period. Contact Archív about copyright, privacy, or removal requests.

## Technical storage model

- `users/{uid}/setPhotos/{setNumber}`: private/working JPEG copy, typed signature, copyright assignment version, timestamps and `private|pending|approved|rejected` status. Account deletion deletes these records.
- `communitySetPhotos/{randomPhotoId}`: a permanent, approved image and set number; **no public UID or signed legal name**. Readable by everyone; created/unpublished only by moderators. Multiple approved images per set allowed.
- `communityPhotoAssignments/{randomPhotoId}`: restricted audit of uploader UID, signed legal name, signature time, agreement version, set, approval time, and published photo ID. Survives account deletion; write-once/moderator-only.
- Images are converted locally to JPEG, capped at 340,000 base64 characters (~250 KB), and stored in Firestore for initial low-volume deployment. Reassess costs, quotas, and object storage/CDN for scale.

## Release and security validation required BEFORE enabling uploads

- [ ] Identify Archív's actual legal operator/transferee and have counsel approve the electronically signed rights assignment, Terms and Privacy Policy.
- [ ] Publish the approved Terms and Privacy Policy on both production and preview before enabling the feature anywhere.
- [ ] Deploy tested, reconciled `firestore.rules` from this branch in Firebase project `archiv-3f5df`; GitHub file changes alone do not deploy rules.
- [ ] Run Firebase Emulator Suite tests: signed-in owner with **Owned** set may upload; nonowner rejected; private photos not readable by other users or admins without pending status; admin can query only pending; only admin can publish/unpublish; uploader cannot delete or overwrite published community copies; audit records admin-only and immutable; deleted account cannot write photo data.
- [ ] Check cross-write consistency: admin publication and audit create in the same batch; stale pending submission cannot be approved.
- [ ] Confirm assignment evidence uses trustworthy server time, a verifiable signed agreement version, and legal-entity identification, with no unintended publication of signed personal information.
- [ ] With distinct collector and admin test accounts: upload private, upload pending, approve, reject, repeat approval for another photo of the same set, delete private photo, delete account, verify **community gallery persists**, and confirm retained audit availability for legal purposes.
- [ ] Confirm `collectionGroup("setPhotos")` pending query and necessary indexes, plus `communitySetPhotos` set-number query.
- [ ] Explicitly activate `VITE_PHOTO_BACKEND_READY=true` in a staging-only build after backend tests. Keep production pinned until separately approved.
- [ ] Check UI on mobile and validate replacement, cancellation, error recovery, and photo ownership warnings.

## Current limitations

Uploads are intentionally disabled by default. Neither a passing source test nor a GitHub Pages deployment verifies Firebase security rules. This prototype uses Firestore to hold compressed JPEG payloads, not a production-grade media CDN. Public images are displayed on set details as separately labeled community photos, not substituted for catalog tiles. Moderator decisions are manual. No old upload can be assigned retroactively without separate signed consent.
