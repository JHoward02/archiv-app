import { describe, expect, it } from "vitest";
import { createCollectorProfile, decideGoogleAuth, firstNameFromDisplayName, personalArchiveTitle, signupBannerText } from "../src/auth-signup-decision";

describe("explicit Archív registration",()=>{
 it("never admits a brand-new Google account through Sign in",()=>{
  expect(decideGoogleAuth("sign-in",true)).toBe("sign-up-required");
 });
 it("admits an existing account through Sign in",()=>{
  expect(decideGoogleAuth("sign-in",false)).toBe("existing");
 });
 it("creates a new account only through Sign up",()=>{
  expect(decideGoogleAuth("sign-up",true)).toBe("created");
 });
 it("allows an existing Google account on the Sign up route without duplicating it",()=>{
  expect(decideGoogleAuth("sign-up",false)).toBe("existing");
 });
 it("refuses sign-in if Firebase does not return new/existing status",()=>{
  expect(decideGoogleAuth("sign-in",null)).toBe("unknown");
  expect(decideGoogleAuth("sign-up",null)).toBe("unknown");
 });
 it("stores communicationsOptIn false for an unchecked sign-up",()=>{
  const profile=createCollectorProfile("Jane Collector","collector@example.com",false,"2026-10-31T21:00:00.000Z");
  expect(profile).toEqual({
   name:"Jane Collector",email:"collector@example.com",
   firstSeen:"2026-10-31T21:00:00.000Z",lastSeen:"2026-10-31T21:00:00.000Z",
   communicationsOptIn:false
  });
 });
 it("stores true only after choosing optional email updates",()=>{
  const profile=createCollectorProfile(null,null,true,"2026-10-31T21:00:00.000Z");
  expect(profile.communicationsOptIn).toBe(true);
  expect(profile.name).toBe("Collector");
  expect(profile.email).toBe("");
  expect(Object.keys(profile).sort()).toEqual(["communicationsOptIn","email","firstSeen","lastSeen","name"].sort());
 });
 it("shows a truthful registration banner even on a direct sign-up visit",()=>{
  expect(signupBannerText(false)).toBe("New to Archív? Create your free collector account below.");
 });
 it("preserves the exact missing-account explanation after Sign in finds no account",()=>{
  expect(signupBannerText(true)).toBe("No Archív account was found for that Google account. You can create one below.");
 });

 it("uses only a first name from a full Google display name",()=>{
  expect(firstNameFromDisplayName("Jane Elizabeth Collector")).toBe("Jane");
  expect(firstNameFromDisplayName("  John  Smith ")).toBe("John");
  expect(firstNameFromDisplayName("Anne-Marie D'Angelo")).toBe("Anne-Marie");
  expect(firstNameFromDisplayName("Zoë García")).toBe("Zoë");
  expect(firstNameFromDisplayName("Chris")).toBe("Chris");
 });
 it("never guesses first name from an email when the Google name is unavailable",()=>{
  expect(firstNameFromDisplayName(null)).toBe("Collector");
  expect(firstNameFromDisplayName("  ")).toBe("Collector");
  expect(personalArchiveTitle(null)).toBe("Your Archív");
 });
 it("creates personalized headings without displaying surname",()=>{
  expect(personalArchiveTitle("John Smith")).toBe("John's Archív");
  expect(personalArchiveTitle("Chris Jones")).toBe("Chris's Archív");
  expect(personalArchiveTitle("Zoë García")).toBe("Zoë's Archív");
 });
});
