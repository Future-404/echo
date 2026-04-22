package com.echo.app;

import android.content.Context;
import android.content.SharedPreferences;

/** 桌宠对话配置，通过 SharedPreferences 在 App 和 Service 之间共享 */
public class FloatingPetConfig {
    private static final String PREFS = "floating_pet_config";

    public static void save(Context ctx, String apiKey, String endpoint, String model, String systemPrompt) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("apiKey", apiKey)
            .putString("endpoint", endpoint)
            .putString("model", model)
            .putString("systemPrompt", systemPrompt)
            .apply();
    }

    public static String getApiKey(Context ctx)      { return get(ctx, "apiKey", ""); }
    public static String getEndpoint(Context ctx)    { return get(ctx, "endpoint", "https://api.openai.com/v1"); }
    public static String getModel(Context ctx)       { return get(ctx, "model", "gpt-4o-mini"); }
    public static String getSystemPrompt(Context ctx){ return get(ctx, "systemPrompt", "你是一个可爱的桌面宠物助手。回复简短自然，1-2句话。"); }

    private static String get(Context ctx, String key, String def) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(key, def);
    }
}
