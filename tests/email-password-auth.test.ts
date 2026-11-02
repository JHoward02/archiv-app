import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
const app=readFileSync("src/lego-entry.ts","utf8");
const css=readFileSync("src/lego-styles.css","utf8");
const privacy=readFileSync("public/privacy.html","utf8");
const terms=readFileSync("public/terms.html","utf8");
describe("Archív Google and email authentication",()=>{
 it("shows separate sign-in and sign-up routes from the menu",()=>{
  expect(app).toContain('menu.append(button("Sign in",()=>{account.open=false;goAuthPage("sign-in")}')
  expect(app).toContain('menu.append(button("Sign up",()=>{account.open=false;goAuthPage("sign-up")}')
  expect(app).toContain('if(location.hash==="#/sign-in"&&!currentUser){renderSignIn(shell);return}');
  expect(app).toContain('if(location.hash==="#/sign-up"&&!currentUser){renderSignup(shell);return}');
 });
 it("offers Google and email as selectable methods",()=>{
  expect(app).toContain('button("Continue with Google"');
  expect(app).toContain('"Continue with email"');
  expect(app).toContain('function renderAuthPage(shell:HTMLElement,intent:GoogleAuthIntent)');
  expect(css).toContain(".archiv-auth-methods{");
 });
 it("retains Google protection and separates email sign-in from account creation",()=>{
  expect(app).toContain('await acceptGoogleAuth(result,intent)');
  expect(app).toContain('await signInWithEmailAndPassword(legoAuth,address,password)');
  expect(app).toContain('const result=await createUserWithEmailAndPassword(legoAuth,address,password)');
  expect(app).toContain('authAttempt=intent;accountError="";authFormNotice="";authNotice=""');
 });
 it("supports optional mailing preference, verification and password reset",()=>{
  expect(app).toContain('createCollectorProfile(name,result.user.email,signupCommunicationsOptIn');
  expect(app).toContain('await sendEmailVerification(result.user)');
  expect(app).toContain('await sendPasswordResetEmail(legoAuth,address)');
  expect(app).toContain('check.checked=signupCommunicationsOptIn');
  expect(app).toContain('input.setAttribute("autocomplete",autocomplete)');
 });
 it("reauthenticates email users for deletion and preserves Google deletion",()=>{
  expect(app).toContain('user.providerData.some(provider=>provider.providerId==="password")');
  expect(app).toContain('reauthenticateWithCredential(user,EmailAuthProvider.credential(user.email,deletionPassword))');
  expect(app).toContain('await reauthenticateWithPopup(user,new GoogleAuthProvider())');
 });
 it("routes signed-out save requests to the method choice rather than Google-only sign-in",()=>{
  expect(app).toContain('if(!currentUser){goAuthPage("sign-in");return}');
  expect(app).toContain('const clearingStarted=deletingAccount');
  expect(app).toContain('"Identity confirmation failed: "');
 });
 it("discloses both credential methods in policies",()=>{
  expect(privacy).toContain("using Google or an email address and password");
  expect(privacy).toContain("Archív does not store passwords");
  expect(terms).toContain("using Google or an email address and password");
 });
});

describe("Archív branded support contact",()=>{
 it("uses the current support inbox in account errors, photo removal and legal/contact pages",()=>{
  const contact=readFileSync("public/contact.html","utf8");
  const photos=readFileSync("src/lego-photo-contributions.ts","utf8");
  for(const page of [app,privacy,terms,contact,photos]){
   expect(page).toContain("support@archivcollect.com");
   expect(page).not.toContain(["getshelfiecollect","gmail.com"].join("@"));
   expect(page).not.toContain(["support","archivecollect.com"].join("@"));
  }
  expect(contact).toContain("archiv-red-brick-accent-logo.webp");
  expect(contact).toContain('mailto:support@archivcollect.com');
 });
});
