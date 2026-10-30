# Archív registered-user count backend

The Archív web app runs on GitHub Pages and cannot securely read the Firebase Authentication user list. This separate Firebase Cloud Function runs with Firebase Admin SDK permissions. It checks the caller's existing Firestore `adminAccess/{uid}.enabled === true` document before counting accounts, and returns only the count.

## One-time setup

Cloud Functions deployment may require upgrading the Firebase project to the **Blaze (pay-as-you-go)** plan, even for low usage. Do not upgrade or deploy unless you accept the potential charges.

From the repository root, with Firebase CLI installed and logged into the correct account:

```sh
cd firebase-analytics/functions
npm install
cd ..
firebase deploy --only functions:archiv-analytics --project archiv-3f5df
```

The root `firebase-analytics/firebase.json` is the functions-only deployment configuration. The deployed function is named `archivRegisteredUsers` and runs in `us-central1`.

After deployment, reload the staging admin dashboard and click **Refresh data**. The **Total registered Firebase Authentication accounts** card will display the live account total.

Without the function, the dashboard shows **Not connected** rather than an invented count. The existing **Accounts seen since registration tracking began** is still available.

The function uses the user's Firebase Authentication ID token and server-side access check; no service account key or Admin SDK secret is placed in the browser.

## Scope and limitations

The count includes Firebase Authentication accounts for the entire `archiv-3f5df` project, potentially including legacy Archív accounts, not strictly accounts that used the LEGO experience. For exact LEGO-only registration metrics, report first LEGO use separately.
