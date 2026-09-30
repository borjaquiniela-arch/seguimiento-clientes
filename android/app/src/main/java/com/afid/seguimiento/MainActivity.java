package com.afid.seguimiento;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private static final String PREFS = "seguimiento";
    private static final String KEY_URL = "server_url";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String saved = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_URL, "");
        if (saved == null || saved.isEmpty()) {
            showSetup();
        } else {
            showWeb(saved);
        }
    }

    private void showSetup() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(48, 80, 48, 48);

        EditText input = new EditText(this);
        input.setHint("https://su-app.onrender.com");
        box.addView(input);

        Button go = new Button(this);
        go.setText("Conectar al servidor");
        go.setOnClickListener(v -> {
            String url = input.getText().toString().trim();
            if (!url.startsWith("http")) url = "http://" + url;
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_URL, url).apply();
            showWeb(url);
        });
        box.addView(go);
        setContentView(box);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void showWeb(String url) {
        WebView web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        web.setWebViewClient(new WebViewClient());
        web.loadUrl(url);
        setContentView(web);
    }
}
