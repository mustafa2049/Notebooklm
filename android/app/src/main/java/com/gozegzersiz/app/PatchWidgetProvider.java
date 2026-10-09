package com.gozegzersiz.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Ana ekran aracı: bugünkü kapama süresi ve tek dokunuşla "Bandı taktım / çıkardım".
 * Uygulama kapalıyken yapılan işlemler sıraya yazılır; uygulama açılınca WidgetBridgePlugin ile aktarılır.
 */
public class PatchWidgetProvider extends AppWidgetProvider {
    static final String ACTION_TOGGLE = "com.gozegzersiz.app.WIDGET_TOGGLE";
    static final String PREFS = "goz_widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, render(context));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_TOGGLE.equals(intent.getAction())) {
            toggle(context);
            updateAll(context);
        }
    }

    static String dayKey(long t) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(t));
    }

    static long startOfToday(long now) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    /** Bugün tamamlanan dakikalar (gün değiştiyse 0). */
    static int todayMinutes(SharedPreferences p, long now) {
        return dayKey(now).equals(p.getString("day", "")) ? p.getInt("todayMin", 0) : 0;
    }

    static void toggle(Context context) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        long running = p.getLong("runningSince", 0);
        int today = todayMinutes(p, now);
        JSONArray actions;
        try {
            actions = new JSONArray(p.getString("actions", "[]"));
        } catch (JSONException e) {
            actions = new JSONArray();
        }
        JSONObject action = new JSONObject();
        try {
            action.put("type", running > 0 ? "stop" : "start");
            action.put("at", now);
        } catch (JSONException ignored) {
            // olmaz
        }
        actions.put(action);
        SharedPreferences.Editor e = p.edit();
        if (running > 0) {
            long from = Math.max(running, startOfToday(now));
            e.putInt("todayMin", today + (int) ((now - from) / 60000));
            e.putLong("runningSince", 0);
        } else {
            e.putInt("todayMin", today);
            e.putLong("runningSince", now);
        }
        e.putString("day", dayKey(now));
        e.putString("actions", actions.toString());
        e.apply();
    }

    static void updateAll(Context context) {
        AppWidgetManager m = AppWidgetManager.getInstance(context);
        int[] ids = m.getAppWidgetIds(new ComponentName(context, PatchWidgetProvider.class));
        for (int id : ids) m.updateAppWidget(id, render(context));
    }

    static RemoteViews render(Context context) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        long running = p.getLong("runningSince", 0);
        int today = todayMinutes(p, now);
        int goal = Math.max(1, p.getInt("goalMin", 120));
        String name = p.getString("name", "");
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_patch);

        v.setTextViewText(R.id.widget_title, name.isEmpty() ? "Göz Egzersiz" : "Göz Egzersiz · " + name);
        int runningMin = running > 0 ? (int) ((now - Math.max(running, startOfToday(now))) / 60000) : 0;
        int total = today + runningMin;
        v.setProgressBar(R.id.widget_progress, goal, Math.min(goal, total), false);
        v.setTextViewText(R.id.widget_goal, "Hedef " + formatMinutes(goal));
        if (running > 0) {
            long elapsedToday = today * 60000L + (now - Math.max(running, startOfToday(now)));
            v.setChronometer(R.id.widget_chrono, SystemClock.elapsedRealtime() - elapsedToday, null, true);
            v.setViewVisibility(R.id.widget_chrono, View.VISIBLE);
            v.setViewVisibility(R.id.widget_today, View.GONE);
            v.setTextViewText(R.id.widget_toggle, "⏸ Bandı çıkardım");
        } else {
            v.setChronometer(R.id.widget_chrono, SystemClock.elapsedRealtime(), null, false);
            v.setViewVisibility(R.id.widget_chrono, View.GONE);
            v.setViewVisibility(R.id.widget_today, View.VISIBLE);
            v.setTextViewText(R.id.widget_today, "Bugün " + formatMinutes(total));
            v.setTextViewText(R.id.widget_toggle, total >= goal ? "🎉 Hedef tamam · yeniden tak" : "▶ Bandı taktım");
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        Intent toggle = new Intent(context, PatchWidgetProvider.class).setAction(ACTION_TOGGLE);
        v.setOnClickPendingIntent(R.id.widget_toggle, PendingIntent.getBroadcast(context, 1, toggle, flags));
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null) v.setOnClickPendingIntent(R.id.widget_title, PendingIntent.getActivity(context, 2, open, flags));
        return v;
    }

    static String formatMinutes(int m) {
        if (m < 60) return m + " dk";
        int h = m / 60;
        int r = m % 60;
        return r == 0 ? h + " sa" : h + " sa " + r + " dk";
    }
}
