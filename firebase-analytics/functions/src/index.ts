import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";

initializeApp();

/**
 * Returns the exact number of Firebase Authentication accounts.
 * Only explicitly provisioned reporting administrators can call this.
 * This runs on the server, never exposing Firebase Admin credentials.
 */
export const archivRegisteredUsers = onCall({region:"us-central1",enforceAppCheck:false}, async (request) => {
  const uid=request.auth?.uid;
  if(!uid) throw new HttpsError("unauthenticated","Sign-in required.");
  const access=await getFirestore().doc("adminAccess/"+uid).get();
  if(access.data()?.enabled!==true)throw new HttpsError("permission-denied","Administrator access required.");
  let count=0;
  let token: string|undefined;
  do {
    const page=await getAuth().listUsers(1000,token);
    count+=page.users.length;
    token=page.pageToken;
  } while(token);
  return {count,source:"firebase-auth",measuredAt:new Date().toISOString()};
});
