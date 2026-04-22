package com.echo.app;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.app.*;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.opengl.GLSurfaceView;
import android.os.Build;
import android.os.IBinder;
import android.view.*;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.core.app.NotificationCompat;

/**
 * 悬浮桌宠前台服务
 * 移植自 NyaDeskPetAPP (https://github.com/gameswu/NyaDeskPetAPP)
 * 感谢原作者 gameswu 的开源贡献
 */
public class FloatingPetService extends Service {

    private static final String CHANNEL_ID = "echo_floating_pet";
    private static final int NOTIFICATION_ID = 2001;
    public static final String ACTION_STOP = "com.echo.app.STOP_FLOATING_PET";
    private static final String MODEL_PATH =
        "models/live2d/mao_pro_zh/runtime/mao_pro.model3.json";

    private static boolean sRunning = false;
    public static boolean isRunning() { return sRunning; }

    private WindowManager windowManager;
    private View overlayView;
    private GLSurfaceView glSurfaceView;
    private Live2DRenderer renderer;
    private ImageView fallbackImageView; // Live2D 不可用时的 fallback
    private int touchMotionIdx = 0; // 轮流播放 special 动作

    // 对话
    private PetLlmClient llmClient;
    private DialogueBubble bubble;
    private ChatInputOverlay inputOverlay;
    private final java.util.concurrent.ExecutorService executor =
        java.util.concurrent.Executors.newSingleThreadExecutor();

    // 视线跟随
    private float gazeX = 0f, gazeY = 0f;
    private android.os.Handler gazeHandler;
    private Runnable gazeResetRunnable;

    private int initX, initY;
    private float initTouchX, initTouchY;
    private long lastClickTime = 0;
    private static final long DOUBLE_CLICK_MS = 300;
    private static final long LONG_PRESS_MS = 600;
    private static final float DRAG_THRESHOLD = 20f;

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        sRunning = true;
        createNotificationChannel();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, buildNotification(),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, buildNotification());
        }
        gazeHandler = new android.os.Handler(android.os.Looper.getMainLooper());
        gazeResetRunnable = () -> {
            gazeX = 0f; gazeY = 0f;
            applyGaze();
        };
        // 初始化 LLM 客户端和气泡
        llmClient = new PetLlmClient(FloatingPetConfig.getSystemPrompt(this));
        bubble = new DialogueBubble(this, (WindowManager) getSystemService(WINDOW_SERVICE));
        inputOverlay = new ChatInputOverlay(this, (WindowManager) getSystemService(WINDOW_SERVICE));
        createOverlayWindow();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        sRunning = false;
        executor.shutdownNow();
        if (bubble != null) bubble.destroy();
        if (inputOverlay != null) inputOverlay.dismiss();
        if (glSurfaceView != null) {
            try { glSurfaceView.onPause(); } catch (Exception ignored) {}
        }
        if (overlayView != null && windowManager != null) {
            try { windowManager.removeView(overlayView); } catch (Exception ignored) {}
        }
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "桌宠", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(this, 0, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent stop = new Intent(this, FloatingPetService.class).setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(this, 1, stop,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentTitle("Echo 桌宠运行中")
            .setContentText("点击返回应用")
            .setOngoing(true)
            .setContentIntent(openPi)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "关闭", stopPi)
            .build();
    }

    private void createOverlayWindow() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        float dp = getResources().getDisplayMetrics().density;
        int sizePx = (int) (200 * dp);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            sizePx, sizePx, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 300;

        FrameLayout container = new FrameLayout(this);

        if (Live2DRenderer.nativeAvailable) {
            GLSurfaceView glView = new GLSurfaceView(this);
            glView.setEGLContextClientVersion(2);
            glView.setEGLConfigChooser(8, 8, 8, 8, 16, 0);
            glView.getHolder().setFormat(PixelFormat.TRANSLUCENT);
            glView.setZOrderOnTop(true);
            Live2DRenderer r = new Live2DRenderer(getAssets());
            r.pendingModelPath = MODEL_PATH;
            glView.setRenderer(r);
            glView.setRenderMode(GLSurfaceView.RENDERMODE_CONTINUOUSLY);
            renderer = r;
            glSurfaceView = glView;
            container.addView(glView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        } else {
            ImageView img = new ImageView(this);
            img.setImageResource(R.mipmap.ic_launcher_round);
            img.setScaleType(ImageView.ScaleType.FIT_CENTER);
            fallbackImageView = img;
            container.addView(img, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        }

        setupTouch(container, params);
        windowManager.addView(container, params);
        overlayView = container;
    }

    private final android.os.Handler mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private Runnable longPressRunnable;

    private void setupTouch(View view, WindowManager.LayoutParams params) {
        view.setOnTouchListener((v, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    initX = params.x; initY = params.y;
                    initTouchX = event.getRawX(); initTouchY = event.getRawY();
                    gazeHandler.removeCallbacks(gazeResetRunnable);
                    // 长按检测
                    longPressRunnable = () -> {
                        float dx = Math.abs(initTouchX - initTouchX); // 已在 DOWN 时记录，MOVE 会取消
                        onLongPress(params.x, params.y);
                    };
                    mainHandler.postDelayed(longPressRunnable, LONG_PRESS_MS);
                    return true;
                case MotionEvent.ACTION_MOVE:
                    float mdx = Math.abs(event.getRawX() - initTouchX);
                    float mdy = Math.abs(event.getRawY() - initTouchY);
                    if (mdx > DRAG_THRESHOLD || mdy > DRAG_THRESHOLD) {
                        // 超过拖拽阈值，取消长按
                        if (longPressRunnable != null) { mainHandler.removeCallbacks(longPressRunnable); longPressRunnable = null; }
                    }
                    params.x = initX + (int)(event.getRawX() - initTouchX);
                    params.y = initY + (int)(event.getRawY() - initTouchY);
                    try { windowManager.updateViewLayout(view, params); } catch (Exception ignored) {}
                    if (bubble != null) bubble.updatePosition(params.x, params.y, view.getWidth());
                    if (renderer != null && glSurfaceView != null) {
                        float nx = ((event.getX() / view.getWidth()) * 2f - 1f);
                        float ny = -((event.getY() / view.getHeight()) * 2f - 1f);
                        gazeX = Math.max(-1f, Math.min(1f, nx));
                        gazeY = Math.max(-1f, Math.min(1f, ny));
                        applyGaze();
                    }
                    return true;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    boolean wasLongPress = longPressRunnable == null; // 已触发则为 null
                    if (longPressRunnable != null) { mainHandler.removeCallbacks(longPressRunnable); longPressRunnable = null; }
                    float dx = Math.abs(event.getRawX() - initTouchX);
                    float dy = Math.abs(event.getRawY() - initTouchY);
                    if (!wasLongPress && event.getActionMasked() == MotionEvent.ACTION_UP
                            && dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
                        long now = System.currentTimeMillis();
                        if (now - lastClickTime < DOUBLE_CLICK_MS) {
                            openApp(); lastClickTime = 0;
                        } else {
                            lastClickTime = now;
                            playTouchMotion();
                        }
                    }
                    gazeHandler.removeCallbacks(gazeResetRunnable);
                    gazeHandler.postDelayed(gazeResetRunnable, 1500);
                    return true;
            }
            return false;
        });
    }

    private void onLongPress(int petX, int petY) {
        longPressRunnable = null; // 标记已触发
        lastClickTime = 0; // 防止长按后触发单击
        if (inputOverlay.isShowing()) {
            inputOverlay.dismiss();
        } else {
            inputOverlay.show(petX, petY, this::sendUserMessage);
        }
    }

    private void sendUserMessage(String text) {
        String apiKey = FloatingPetConfig.getApiKey(this);
        if (apiKey.isEmpty()) { bubble.show("未配置 API Key"); return; }
        llmClient.setSystemPrompt(FloatingPetConfig.getSystemPrompt(this));
        bubble.startStream();
        executor.execute(() ->
            llmClient.chat(apiKey, FloatingPetConfig.getEndpoint(this),
                FloatingPetConfig.getModel(this), text, new PetLlmClient.StreamCallback() {
                    @Override public void onChunk(String delta) { bubble.appendChunk(delta); }
                    @Override public void onDone(String full)   { bubble.endStream(); }
                    @Override public void onError(String err)   {
                        android.util.Log.e("FloatingPet", "LLM error: " + err);
                        bubble.show("对话失败: " + err);
                    }
                })
        );
    }

    private void applyGaze() {
        if (renderer == null || glSurfaceView == null) return;
        float x = gazeX, y = gazeY;
        glSurfaceView.queueEvent(() -> {
            renderer.nativeSetParameterValue("ParamEyeBallX", x);
            renderer.nativeSetParameterValue("ParamEyeBallY", y);
            renderer.nativeSetParameterValue("ParamAngleX", x * 30f);
            renderer.nativeSetParameterValue("ParamAngleY", y * 30f);
            renderer.nativeSetParameterValue("ParamAngleZ", x * y * -30f);
            renderer.nativeSetParameterValue("ParamBodyAngleX", x * 10f);
        });
    }

    private void playTouchMotion() {
        android.util.Log.d("FloatingPet", "playTouchMotion: nativeAvailable=" + Live2DRenderer.nativeAvailable
            + " renderer=" + renderer + " fallback=" + fallbackImageView);
        if (Live2DRenderer.nativeAvailable && renderer != null && glSurfaceView != null) {
            int idx = 3 + (touchMotionIdx % 3);
            touchMotionIdx++;
            glSurfaceView.queueEvent(() -> renderer.nativeStartMotion("", idx, 2));
        }
        // fallback 动画：无论 Live2D 是否可用都执行（给用户视觉反馈）
        View target = fallbackImageView != null ? fallbackImageView : overlayView;
        if (target != null) {
            AnimatorSet anim = new AnimatorSet();
            ObjectAnimator scaleX = ObjectAnimator.ofFloat(target, "scaleX", 1f, 1.2f, 1f);
            ObjectAnimator scaleY = ObjectAnimator.ofFloat(target, "scaleY", 1f, 1.2f, 1f);
            scaleX.setInterpolator(new OvershootInterpolator(3f));
            scaleY.setInterpolator(new OvershootInterpolator(3f));
            anim.playTogether(scaleX, scaleY);
            anim.setDuration(300);
            anim.start();
        }
        triggerLlmGreeting();
    }

    private void triggerLlmGreeting() {
        String apiKey = FloatingPetConfig.getApiKey(this);
        android.util.Log.d("FloatingPet", "triggerLlmGreeting: apiKey=" + (apiKey.isEmpty() ? "EMPTY" : "***"));
        if (apiKey.isEmpty()) {
            // 未配置时显示提示气泡
            bubble.show("未配置 API Key，请在 Echo 设置中配置后重启桌宠");
            return;
        }

        String endpoint = FloatingPetConfig.getEndpoint(this);
        String model = FloatingPetConfig.getModel(this);
        llmClient.setSystemPrompt(FloatingPetConfig.getSystemPrompt(this));

        int hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY);
        String trigger;
        if (hour < 6)       trigger = "（用户在深夜点了你）";
        else if (hour < 12) trigger = "（用户在早上点了你）";
        else if (hour < 18) trigger = "（用户在下午点了你）";
        else                trigger = "（用户在晚上点了你）";

        bubble.startStream();
        executor.execute(() ->
            llmClient.chat(apiKey, endpoint, model, trigger, new PetLlmClient.StreamCallback() {
                @Override public void onChunk(String delta) { bubble.appendChunk(delta); }
                @Override public void onDone(String full)   { bubble.endStream(); }
                @Override public void onError(String err)   {
                    android.util.Log.e("FloatingPet", "LLM error: " + err);
                    bubble.show("对话失败: " + err);
                }
            })
        );
    }

    private void openApp() {
        startActivity(new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP |
                      Intent.FLAG_ACTIVITY_CLEAR_TOP |
                      Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    public static void start(Context ctx) {
        Intent i = new Intent(ctx, FloatingPetService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i);
        else ctx.startService(i);
    }

    public static void stop(Context ctx) {
        ctx.stopService(new Intent(ctx, FloatingPetService.class));
    }
}
