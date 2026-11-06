package com.archiv.fieldtest;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.List;

/** Field-test container uses the device browser, preserving Google OAuth and file handling. */
public final class MainActivity extends Activity {
    private static final String APP_URL = "https://jhoward02.github.io/archiv-app/";
    private TextView status;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setGravity(Gravity.CENTER);
        page.setBackgroundColor(Color.rgb(244,239,230));
        final int padding = (int)(24 * getResources().getDisplayMetrics().density);
        page.setPadding(padding,padding,padding,padding);
        page.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
            view.setPadding(padding + insets.getSystemWindowInsetLeft(),padding + insets.getSystemWindowInsetTop(),padding + insets.getSystemWindowInsetRight(),padding + insets.getSystemWindowInsetBottom());
            return insets;
            }
        });
        TextView title = new TextView(this);
        title.setText("Archív"); title.setTextSize(40); title.setTextColor(Color.rgb(8,36,59));
        page.addView(title);
        status = new TextView(this);
        status.setText("Field test · 0.1.0\nYour collection lives here.\n\nInternet and an Android browser are required.");
        status.setTextSize(16); status.setGravity(Gravity.CENTER); status.setTextColor(Color.rgb(111,106,98));
        status.setPadding(0,padding,0,padding); page.addView(status);
        Button open = new Button(this); open.setText("Open your Archív"); open.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View view) { openApp(); } }); page.addView(open);
        setContentView(page);
        if (state == null) openApp();
    }

    private void openApp() {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(APP_URL));
        Bundle extras = new Bundle();
        extras.putBinder("android.support.customtabs.extra.SESSION", null);
        intent.putExtras(extras);
        intent.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR", Color.rgb(244,239,230));
        intent.putExtra("android.support.customtabs.extra.TITLE_VISIBILITY", 1);
        intent.putExtra("android.support.customtabs.extra.ENABLE_URLBAR_HIDING", true);
        String browser = customTabsBrowser(intent);
        if (browser != null) intent.setPackage(browser);
        try { startActivity(intent); }
        catch (ActivityNotFoundException error) { status.setText("Install or enable Chrome or another Android browser, then tap Open your Archív."); }
    }

    private String customTabsBrowser(Intent viewIntent) {
        PackageManager pm = getPackageManager();
        ResolveInfo defaultBrowser = pm.resolveActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(APP_URL)), PackageManager.MATCH_DEFAULT_ONLY);
        if (defaultBrowser != null && supportsTabs(pm,defaultBrowser.activityInfo.packageName)) return defaultBrowser.activityInfo.packageName;
        List<ResolveInfo> browsers = pm.queryIntentActivities(viewIntent,0);
        for (ResolveInfo browser : browsers) if (supportsTabs(pm,browser.activityInfo.packageName)) return browser.activityInfo.packageName;
        return null;
    }
    private boolean supportsTabs(PackageManager pm,String name) {
        Intent service = new Intent("android.support.customtabs.action.CustomTabsService"); service.setPackage(name);
        return pm.resolveService(service,0) != null;
    }
}
