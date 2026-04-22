package com.echo.app;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.os.*;
import android.view.*;
import android.widget.*;

/**
 * 宠物头顶气泡，通过 WindowManager 叠加显示。
 * 支持流式打字机效果和自动消失。
 */
public class DialogueBubble {
    private static final int AUTO_HIDE_MS = 5000;
    private static final int TYPEWRITER_INTERVAL_MS = 40;

    private final Context ctx;
    private final WindowManager wm;
    private View bubbleView;
    private TextView textView;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable hideRunnable;
    private Runnable typewriterRunnable;
    private String pendingText = "";
    private int typewriterPos = 0;

    public DialogueBubble(Context ctx, WindowManager wm) {
        this.ctx = ctx;
        this.wm = wm;
    }

    /** 开始流式显示（先清空，逐字追加） */
    public void startStream() {
        handler.post(() -> {
            cancelAutoHide();
            cancelTypewriter();
            ensureView();
            textView.setText("...");
            bubbleView.setVisibility(View.VISIBLE);
        });
    }

    /** 追加流式 chunk */
    public void appendChunk(String chunk) {
        handler.post(() -> {
            if (bubbleView == null) return;
            String current = textView.getText().toString();
            if ("...".equals(current)) current = "";
            textView.setText(current + chunk);
        });
    }

    /** 流式结束，启动自动消失计时 */
    public void endStream() {
        handler.post(() -> scheduleAutoHide());
    }

    /** 非流式：打字机效果显示完整文本 */
    public void show(String text) {
        handler.post(() -> {
            cancelAutoHide();
            cancelTypewriter();
            ensureView();
            pendingText = text;
            typewriterPos = 0;
            textView.setText("");
            bubbleView.setVisibility(View.VISIBLE);
            startTypewriter();
        });
    }

    public void hide() {
        handler.post(() -> {
            cancelAutoHide();
            cancelTypewriter();
            if (bubbleView != null) bubbleView.setVisibility(View.GONE);
        });
    }

    public void destroy() {
        handler.post(() -> {
            cancelAutoHide();
            cancelTypewriter();
            if (bubbleView != null) {
                try { wm.removeView(bubbleView); } catch (Exception ignored) {}
                bubbleView = null;
            }
        });
    }

    /** 更新气泡位置（跟随宠物窗口） */
    public void updatePosition(int petX, int petY, int petSize) {
        if (bubbleView == null) return;
        handler.post(() -> {
            try {
                WindowManager.LayoutParams p = (WindowManager.LayoutParams) bubbleView.getLayoutParams();
                p.x = petX;
                p.y = Math.max(0, petY - dpToPx(80));
                wm.updateViewLayout(bubbleView, p);
            } catch (Exception ignored) {}
        });
    }

    // ── 内部 ──────────────────────────────────────────────────────────────────

    private void ensureView() {
        if (bubbleView != null) return;

        float dp = ctx.getResources().getDisplayMetrics().density;
        int bubbleW = (int)(220 * dp);

        // 圆角半透明背景
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.argb(220, 20, 20, 30));
        bg.setCornerRadius(12 * dp);

        textView = new TextView(ctx);
        textView.setTextColor(Color.WHITE);
        textView.setTextSize(13f);
        textView.setLineSpacing(4 * dp, 1f);
        textView.setPadding((int)(12*dp),(int)(8*dp),(int)(12*dp),(int)(8*dp));
        textView.setBackground(bg);
        textView.setMaxWidth(bubbleW);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE |
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 200;

        bubbleView = textView;
        bubbleView.setVisibility(View.GONE);
        wm.addView(bubbleView, params);
    }

    private void startTypewriter() {
        typewriterRunnable = new Runnable() {
            @Override public void run() {
                if (typewriterPos >= pendingText.length()) {
                    scheduleAutoHide();
                    return;
                }
                // 每次追加 1-2 个字符（中文 1 个，英文 2 个）
                int step = Character.isLetterOrDigit(pendingText.charAt(typewriterPos)) ? 2 : 1;
                int end = Math.min(typewriterPos + step, pendingText.length());
                textView.setText(pendingText.substring(0, end));
                typewriterPos = end;
                handler.postDelayed(this, TYPEWRITER_INTERVAL_MS);
            }
        };
        handler.post(typewriterRunnable);
    }

    private void scheduleAutoHide() {
        cancelAutoHide();
        hideRunnable = () -> hide();
        handler.postDelayed(hideRunnable, AUTO_HIDE_MS);
    }

    private void cancelAutoHide() {
        if (hideRunnable != null) { handler.removeCallbacks(hideRunnable); hideRunnable = null; }
    }

    private void cancelTypewriter() {
        if (typewriterRunnable != null) { handler.removeCallbacks(typewriterRunnable); typewriterRunnable = null; }
    }

    private int dpToPx(int dp) {
        return (int)(dp * ctx.getResources().getDisplayMetrics().density);
    }
}
