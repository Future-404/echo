package com.echo.app;

import android.util.Log;
import org.json.*;
import java.io.*;
import java.net.*;
import java.util.*;

/**
 * 轻量 LLM 客户端，供 FloatingPetService 使用。
 * 支持 OpenAI 兼容接口，流式 SSE 输出。
 */
public class PetLlmClient {
    private static final String TAG = "PetLlmClient";
    private static final int MAX_HISTORY = 10; // 最多保留 10 条历史

    public interface StreamCallback {
        void onChunk(String delta);
        void onDone(String fullText);
        void onError(String error);
    }

    private final List<JSONObject> history = new ArrayList<>();
    private String systemPrompt;

    public PetLlmClient(String systemPrompt) {
        this.systemPrompt = systemPrompt;
    }

    public void setSystemPrompt(String prompt) {
        this.systemPrompt = prompt;
    }

    public void clearHistory() {
        history.clear();
    }

    /** 异步流式请求，在调用线程执行（需在非主线程调用） */
    public void chat(String apiKey, String endpoint, String model, String userMessage, StreamCallback cb) {
        // 加入历史
        try { history.add(new JSONObject().put("role", "user").put("content", userMessage)); }
        catch (JSONException ignored) {}

        // 裁剪历史
        while (history.size() > MAX_HISTORY) history.remove(0);

        try {
            JSONArray messages = new JSONArray();
            messages.put(new JSONObject().put("role", "system").put("content", systemPrompt));
            for (JSONObject m : history) messages.put(m);

            JSONObject body = new JSONObject()
                .put("model", model)
                .put("messages", messages)
                .put("stream", true)
                .put("max_tokens", 200); // 桌宠回复保持简短

            String url = endpoint.replaceAll("/+$", "") + "/chat/completions";
            HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(30000);
            conn.setDoOutput(true);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes("UTF-8"));
            }

            int code = conn.getResponseCode();
            if (code != 200) {
                String err = readStream(conn.getErrorStream());
                cb.onError("HTTP " + code + ": " + err);
                return;
            }

            StringBuilder full = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.startsWith("data: ")) continue;
                    String data = line.substring(6).trim();
                    if ("[DONE]".equals(data)) break;
                    try {
                        String delta = new JSONObject(data)
                            .getJSONArray("choices").getJSONObject(0)
                            .getJSONObject("delta")
                            .optString("content", "");
                        if (!delta.isEmpty()) {
                            full.append(delta);
                            cb.onChunk(delta);
                        }
                    } catch (JSONException ignored) {}
                }
            }

            String result = full.toString();
            // 保存 assistant 回复到历史
            try { history.add(new JSONObject().put("role", "assistant").put("content", result)); }
            catch (JSONException ignored) {}
            while (history.size() > MAX_HISTORY) history.remove(0);

            cb.onDone(result);
        } catch (Exception e) {
            Log.e(TAG, "LLM request failed", e);
            cb.onError(e.getMessage());
        }
    }

    private String readStream(InputStream is) {
        if (is == null) return "";
        try (BufferedReader r = new BufferedReader(new InputStreamReader(is))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            return sb.toString();
        } catch (Exception e) { return ""; }
    }
}
