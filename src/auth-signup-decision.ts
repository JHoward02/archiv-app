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

/** Fields permitted by collectorProfiles/{uid} Firestore rules at registration. */
export function createCollectorProfile(
 displayName:string|null,
 email:string|null,
 communicationsOptIn:boolean,
 registeredAt:string
){
 return {
  name:displayName||"Collector",
  email:email||"",
  firstSeen:registeredAt,
  lastSeen:registeredAt,
  communicationsOptIn:communicationsOptIn===true
 };
}
