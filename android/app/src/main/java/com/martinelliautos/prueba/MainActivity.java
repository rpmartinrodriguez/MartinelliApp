package com.martinelliautos.prueba;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.browser.customtabs.CustomTabsIntent;

public final class MainActivity extends Activity {
    private static final Uri MARTINELLI_URL = Uri.parse("https://martinelli-autos.netlify.app/");
    private boolean attemptedAutoLaunch = false;
    private TextView status;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        renderFallbackScreen();
        // La interfaz nativa sigue disponible si el navegador no abre la web.
        if (savedInstanceState == null) {
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (!isFinishing() && !attemptedAutoLaunch) {
                    attemptedAutoLaunch = true;
                    openCustomTab();
                }
            }, 450);
        }
    }

    private int dp(float px) {
        return Math.round(px * getResources().getDisplayMetrics().density);
    }

    private TextView label(String value, int size, int color, boolean bold) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextSize(size);
        text.setTextColor(color);
        text.setGravity(Gravity.CENTER);
        if (bold) text.setTypeface(null, android.graphics.Typeface.BOLD);
        return text;
    }

    private void renderFallbackScreen() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(248, 250, 252));

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        content.setPadding(dp(26), dp(28), dp(26), dp(28));
        scroll.addView(content);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.app_icon);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(104), dp(104));
        logoParams.gravity = Gravity.CENTER_HORIZONTAL;
        logoParams.bottomMargin = dp(18);
        content.addView(logo, logoParams);

        TextView title = label("MARTINELLI AUTOS", 24, Color.rgb(20, 27, 38), true);
        content.addView(title);
        TextView subtitle = label("Android · Versión de prueba 2", 13, Color.rgb(80, 93, 106), false);
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(-1,-2);
        subtitleParams.topMargin = dp(8);
        subtitleParams.bottomMargin = dp(24);
        content.addView(subtitle,subtitleParams);

        status = label("Se abrirá la aplicación oficial.\nSi no aparece, usá uno de los botones.", 14, Color.rgb(70, 80, 95), false);
        LinearLayout.LayoutParams statusParams = new LinearLayout.LayoutParams(-1,-2);
        statusParams.bottomMargin = dp(28);
        content.addView(status,statusParams);

        Button open = new Button(this);
        open.setText("ABRIR MARTINELLI");
        open.setAllCaps(false);
        open.setTextColor(Color.WHITE);
        open.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(22, 163, 74)));
        open.setOnClickListener(v -> openCustomTab());
        content.addView(open,new LinearLayout.LayoutParams(-1,dp(54)));

        Button browser = new Button(this);
        browser.setText("Abrir directamente en el navegador");
        browser.setAllCaps(false);
        browser.setOnClickListener(v -> openInBrowser());
        LinearLayout.LayoutParams browserParams = new LinearLayout.LayoutParams(-1,dp(52));
        browserParams.topMargin = dp(14);
        content.addView(browser,browserParams);

        TextView description = label("Sincroniza la misma Flota, Caja y Clientes de Martinelli.\nNo crea ni reemplaza bases de datos.", 12, Color.rgb(100, 112, 128), false);
        LinearLayout.LayoutParams descrParams = new LinearLayout.LayoutParams(-1,-2);
        descrParams.topMargin = dp(24);
        content.addView(description,descrParams);
        setContentView(scroll);
    }

    private void openCustomTab() {
        try {
            status.setText("Abriendo Martinelli en Chrome…");
            CustomTabsIntent intent = new CustomTabsIntent.Builder()
                    .setShowTitle(false)
                    .setToolbarColor(Color.rgb(248, 250, 252))
                    .build();
            intent.launchUrl(this,MARTINELLI_URL);
        } catch (RuntimeException error) {
            status.setText("No pudimos iniciar la vista integrada. Probando navegador…");
            openInBrowser();
        }
    }

    private void openInBrowser() {
        Intent browser = new Intent(Intent.ACTION_VIEW,MARTINELLI_URL);
        browser.addCategory(Intent.CATEGORY_BROWSABLE);
        try {
            startActivity(browser);
        } catch (ActivityNotFoundException error) {
            status.setText("No hay navegador disponible. Instalá o actualizá Chrome y volvé a intentarlo.");
        } catch (RuntimeException error) {
            status.setText("No se pudo abrir la web. Revisá Chrome y la conexión a internet.");
        }
    }
}
