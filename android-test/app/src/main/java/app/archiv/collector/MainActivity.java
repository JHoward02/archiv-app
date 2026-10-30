package app.archiv.collector;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import androidx.browser.customtabs.CustomTabsIntent;

/**
 * Installable Android test launcher for Archív.
 * Google/Firebase sign-in stays in the browser rather than an unsupported WebView.
 * Uses production GitHub Pages and always fetches its latest deployed code.
 */
public final class MainActivity extends Activity {
  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    CustomTabsIntent tab = new CustomTabsIntent.Builder().setShowTitle(true).build();
    tab.intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NO_HISTORY);
    tab.launchUrl(this, Uri.parse("https://jhoward02.github.io/archiv-app/"));
    finish();
  }
}
