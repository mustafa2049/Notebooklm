package com.gozegzersiz.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

/** Web uygulaması ile ana ekran aracı arasındaki köprü. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PatchWidgetProvider.PREFS, Context.MODE_PRIVATE);
    }

    /** Uygulamadaki güncel durumu araca yazar ve aracı yeniler. */
    @PluginMethod
    public void update(PluginCall call) {
        SharedPreferences p = prefs();
        SharedPreferences.Editor e = p.edit();
        e.putString("day", call.getString("day", ""));
        e.putInt("todayMin", call.getInt("todayMin", 0));
        e.putInt("goalMin", call.getInt("goalMin", 120));
        e.putString("name", call.getString("name", ""));
        // Uygulamaya henüz aktarılmamış araç işlemi varsa aracın kendi durumu korunur.
        if ("[]".equals(p.getString("actions", "[]"))) {
            Double running = call.getDouble("runningSince", 0.0);
            e.putLong("runningSince", running == null ? 0 : running.longValue());
        }
        e.apply();
        PatchWidgetProvider.updateAll(getContext());
        call.resolve();
    }

    /** Araçta yapılan "bandı taktım / çıkardım" işlemlerini döndürür ve sırayı boşaltır. */
    @PluginMethod
    public void consumeActions(PluginCall call) {
        SharedPreferences p = prefs();
        String raw = p.getString("actions", "[]");
        p.edit().putString("actions", "[]").apply();
        JSObject ret = new JSObject();
        try {
            ret.put("actions", new JSArray(raw));
        } catch (JSONException e) {
            ret.put("actions", new JSArray());
        }
        call.resolve(ret);
    }
}
