package com.echo.app;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.os.*;
import android.view.*;
import android.view.inputmethod.*;
import android.widget.*;

/**
 * 长按宠物弹出的输入框 overlay。
 * 需要 FLAG_NOT_TOUCH_MODAL 使键盘可以弹出。
 */
public class ChatInputOverlay {

    public interface SendCallback {
        void onSend(String text);
    }

    private final Context ctx;
    private final WindowManager wm;
    private View rootView;
    private EditText editText;
    private final Handler handler = new Handler(Looper.getMainLooper());

    public ChatInputOverlay(Context ctx, WindowManager wm) {
        this.ctx = ctx;
        this.wm = wm;
    }

    public void show(int petX, int petY, SendCallback cb) {
        if (rootView != null) { editText.requestFocus(); return; }

        float dp = ctx.getResources().getDisplayMetrics().density;

        // 容器
        LinearLayout layout = new LinearLayout(ctx);
        layout.setOrientation(LinearLayout.HORIZONTAL);
        layout.setPadding((int)(8*dp),(int)(8*dp),(int)(8*dp),(int)(8*dp));
        layout.setGravity(android.view.Gravity.CENTER_VERTICAL);

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.argb(240, 20, 20, 30));
        bg.setCornerRadius(24 * dp);
        layout.setBackground(bg);

        // 输入框
        editText = new EditText(ctx);
        editText.setHint("说点什么...");
        editText.setHintTextColor(Color.argb(120, 255, 255, 255));
        editText.setTextColor(Color.WHITE);
        editText.setTextSize(14f);
        editText.setBackground(null);
        editText.setSingleLine(true);
        editText.setImeOptions(EditorInfo.IME_ACTION_SEND);
        editText.setInputType(android.text.InputType.TYPE_CLASS_TEXT);
        LinearLayout.LayoutParams etParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        layout.addView(editText, etParams);

        // 发送按钮
        TextView sendBtn = new TextView(ctx);
        sendBtn.setText("发送");
        sendBtn.setTextColor(Color.argb(255, 100, 180, 255));
        sendBtn.setTextSize(13f);
        sendBtn.setPadding((int)(8*dp), 0, (int)(4*dp), 0);
        layout.addView(sendBtn);

        // 关闭按钮
        TextView closeBtn = new TextView(ctx);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.argb(180, 255, 255, 255));
        closeBtn.setTextSize(13f);
        closeBtn.setPadding((int)(4*dp), 0, 0, 0);
        layout.addView(closeBtn);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            (int)(280 * dp),
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = Math.max(0, petX - (int)(40 * dp));
        params.y = Math.max(0, petY - (int)(60 * dp));
        params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE |
            WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE;

        rootView = layout;
        wm.addView(rootView, params);

        // 自动弹出键盘
        handler.postDelayed(() -> {
            editText.requestFocus();
            InputMethodManager imm = (InputMethodManager) ctx.getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) imm.showSoftInput(editText, InputMethodManager.SHOW_IMPLICIT);
        }, 100);

        // 发送逻辑
        Runnable doSend = () -> {
            String text = editText.getText().toString().trim();
            if (!text.isEmpty()) {
                dismiss();
                cb.onSend(text);
            }
        };

        sendBtn.setOnClickListener(v -> doSend.run());
        editText.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND) { doSend.run(); return true; }
            return false;
        });
        closeBtn.setOnClickListener(v -> dismiss());

        // 点击外部关闭
        rootView.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_OUTSIDE) { dismiss(); return true; }
            return false;
        });
    }

    public void dismiss() {
        if (rootView == null) return;
        InputMethodManager imm = (InputMethodManager) ctx.getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null && editText != null) imm.hideSoftInputFromWindow(editText.getWindowToken(), 0);
        try { wm.removeView(rootView); } catch (Exception ignored) {}
        rootView = null;
        editText = null;
    }

    public boolean isShowing() { return rootView != null; }
}
