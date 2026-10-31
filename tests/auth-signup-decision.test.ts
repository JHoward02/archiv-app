import { describe, expect, it } from "vitest";
import { decideGoogleAuth } from "../src/auth-signup-decision";

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
});
