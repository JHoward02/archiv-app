package app.archiv.collector;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Archív native UI safe-area handling.
 *
 * Android 15+ enforces edge-to-edge. The root content receives real WindowInsets
 * (including display cutouts, 3-button/gesture navigation, and the keyboard), so
 * neither the Archív logo/account menu nor the footer sits behind system UI.
 * The status bar remains visible and uses dark glyphs against Archív cream.
 */
public final class MainActivity extends BridgeActivity {
    private static final int ARCHIV_CREAM = Color.rgb(244, 239, 230);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        WindowInsetsControllerCompat barIcons =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        barIcons.setAppearanceLightStatusBars(true);
        barIcons.setAppearanceLightNavigationBars(true);

        final View root = findViewById(android.R.id.content);
        if (root == null) return;
        root.setBackgroundColor(ARCHIV_CREAM);

        // Insets are measured in physical pixels; keep UI padding outside WebView
        // rather than guessing device-specific safe areas in CSS.
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout());
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());

            view.setPadding(
                bars.left,
                bars.top,
                bars.right,
                Math.max(bars.bottom, ime.bottom)
            );
            // Applied once at the root, so nested WebView/plugins are not shifted twice.
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(root);
    }
}
