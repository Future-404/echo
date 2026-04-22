package com.echo.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FloatingPet")
public class FloatingPetPlugin extends Plugin {

    @PluginMethod
    public void configure(PluginCall call) {
        String apiKey      = call.getString("apiKey", "");
        String endpoint    = call.getString("endpoint", "https://api.openai.com/v1");
        String model       = call.getString("model", "gpt-4o-mini");
        String systemPrompt= call.getString("systemPrompt", "你是一个可爱的桌面宠物助手。回复简短自然，1-2句话。");
        FloatingPetConfig.save(getContext(), apiKey, endpoint, model, systemPrompt);
        call.resolve();
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M
            || Settings.canDrawOverlays(getContext());
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && !Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && !Settings.canDrawOverlays(getContext())) {
            call.reject("NO_PERMISSION");
            return;
        }
        FloatingPetService.start(getContext());
        // 启动桌宠后将 App 退到后台，避免两个渲染器同时活跃
        getActivity().moveTaskToBack(true);
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        FloatingPetService.stop(getContext());
        call.resolve();
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("running", FloatingPetService.isRunning());
        call.resolve(ret);
    }
}
