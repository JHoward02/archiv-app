// Firebase Google OAuth can create a user as part of sign-in.
// Only explicit sign-up may retain a first-time Firebase account.
export type GoogleAuthIntent="sign-in"|"sign-up";
export type GoogleAuthDecision="sign-up-required"|"created"|"existing"|"unknown";
export function decideGoogleAuth(intent:GoogleAuthIntent,isNewUser:boolean|null):GoogleAuthDecision{
 if(isNewUser===null)return "unknown";
 if(intent==="sign-in"&&isNewUser)return "sign-up-required";
 if(intent==="sign-up"&&isNewUser)return "created";
 return "existing";
}

/** Never display or persist Google family names in collector-facing labels. */
export function firstNameFromDisplayName(displayName:string|null|undefined):string{
 const first=displayName?.trim().split(/\s+/u)[0]||"";
 // Google display names are optional; do not guess from an email address.
 return first||"Collector";
}
export function personalArchiveTitle(displayName:string|null|undefined):string{
 const first=firstNameFromDisplayName(displayName);
 return first==="Collector"?"Your Archív":first+"'s Archív";
}

/** Fields permitted by collectorProfiles/{uid} Firestore rules at registration. */
export function createCollectorProfile(
 displayName:string|null,
 email:string|null,
 communicationsOptIn:boolean,
 registeredAt:string
){
 return {
  name:firstNameFromDisplayName(displayName),
  email:email||"",
  firstSeen:registeredAt,
  lastSeen:registeredAt,
  communicationsOptIn:communicationsOptIn===true
 };
}

/** A direct registration visit must never falsely claim Google was checked. */
export function signupBannerText(missingAccountFromSignIn:boolean):string{
 return missingAccountFromSignIn
  ?"No Archív account was found for that Google account. You can create one below."
  :"New to Archív? Create your free collector account below.";
}
