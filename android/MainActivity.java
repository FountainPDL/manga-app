package com.fountainpdl.comifountain;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private WindowInsetsControllerCompat insetsController;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge: let the web content draw behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Transparent status bar and nav bar
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        insetsController = new WindowInsetsControllerCompat(
            getWindow(), getWindow().getDecorView()
        );

        // Hide nav bar — swipe from bottom to show temporarily
        hideNavBar();
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideNavBar();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideNavBar();
    }

    private void hideNavBar() {
        if (insetsController == null) return;
        // Hide navigation bar
        insetsController.hide(WindowInsetsCompat.Type.navigationBars());
        // Swipe reveals it temporarily, then auto-hides again
        insetsController.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        // Keep status bar hidden too while we're at it
        insetsController.hide(WindowInsetsCompat.Type.statusBars());
    }

    /**
     * Intercept Android back button.
     * Instead of closing the app, fire a JS event so React handles navigation.
     * Only if JS doesn't handle it (i.e., we're on the root screen) do we
     * let Android minimize the app (moveTaskToBack).
     */
    @Override
    public void onBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;

        if (webView != null) {
            // Dispatch custom event to JS — MangaDetailPage / MangaReader catch this
            getBridge().eval(
                "window.dispatchEvent(new CustomEvent('comifountain:backpress', {cancelable:true}));",
                null
            );
            // Small delay then check if we should minimise
            webView.postDelayed(() -> {
                // The JS handler sets window._cfBackHandled = true if it navigated
                getBridge().eval(
                    "var h=window._cfBackHandled; window._cfBackHandled=false; h;",
                    value -> {
                        if (!"true".equals(value)) {
                            // JS didn't handle it — minimize app (don't finish/close)
                            moveTaskToBack(true);
                        }
                    }
                );
            }, 80);
        } else {
            moveTaskToBack(true);
        }
    }
}
