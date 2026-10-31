// Android-only Capacitor entrypoint. This module is imported into the native
// APK build, never into the approved production website.
import { App } from "@capacitor/app";

type CapacitorWindow=Window&{Capacitor?:{isNativePlatform?:()=>boolean}};
const nativeCapacitor=(window as CapacitorWindow).Capacitor;

if(nativeCapacitor?.isNativePlatform?.()){
  // Register a hardware/gesture Back handler. Without this, Capacitor can
  // close the Android Activity instead of navigating Archív's hash routes.
  void App.addListener("backButton",({canGoBack})=>{
    // Close the user/account dropdown before changing pages.
    const account=document.querySelector<HTMLDetailsElement>(".lego-account-controls[open]");
    if(account){account.open=false;return;}

    const route=window.location.hash||"#/";
    if(route==="#/"||route==="#"){
      // At the actual home screen, background the app rather than destroy it.
      void App.minimizeApp();
      return;
    }

    if(canGoBack&&window.history.length>1){
      window.history.back();
      return;
    }

    // A detail/theme page opened without usable WebView history should still
    // return to the Archív home screen instead of exiting the app.
    window.location.hash="#/";
  }).catch(error=>console.warn("Android Back handler registration failed",error));
}
