package com.echo.app;

import android.app.*;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.opengl.GLSurfaceView;
import android.os.Build;
import android.os.IBinder;
import android.view.*;
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
    private int touchMotionIdx = 0; // 轮流播放 special 动作 (Idle group index 4~6)

    private int initX, initY;
    private float initTouchX, initTouchY;
    private long lastClickTime = 0;
    private static final long DOUBLE_CLICK_MS = 300;
    private static final float DRAG_THRESHOLD = 10f;

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
            container.addView(img, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        }

        setupTouch(container, params);
        windowManager.addView(container, params);
        overlayView = container;
    }

    private void setupTouch(View view, WindowManager.LayoutParams params) {
        view.setOnTouchListener((v, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    initX = params.x; initY = params.y;
                    initTouchX = event.getRawX(); initTouchY = event.getRawY();
                    return true;
                case MotionEvent.ACTION_MOVE:
                    params.x = initX + (int)(event.getRawX() - initTouchX);
                    params.y = initY + (int)(event.getRawY() - initTouchY);
                    try { windowManager.updateViewLayout(view, params); } catch (Exception ignored) {}
                    return true;
                case MotionEvent.ACTION_UP:
                    float dx = Math.abs(event.getRawX() - initTouchX);
                    float dy = Math.abs(event.getRawY() - initTouchY);
                    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
                        long now = System.currentTimeMillis();
                        if (now - lastClickTime < DOUBLE_CLICK_MS) {
                            openApp(); lastClickTime = 0;
                        } else {
                            lastClickTime = now;
                            playTouchMotion();
                        }
                    }
                    return true;
            }
            return false;
        });
    }

    private void playTouchMotion() {
        if (renderer == null || glSurfaceView == null) return;
        // Idle group: index 0~3 = mtn, index 4~6 = special
        int idx = 4 + (touchMotionIdx % 3);
        touchMotionIdx++;
        glSurfaceView.queueEvent(() -> renderer.nativeStartMotion("Idle", idx, 2));
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
