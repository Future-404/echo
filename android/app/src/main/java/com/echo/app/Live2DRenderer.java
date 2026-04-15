package com.echo.app;

import android.content.res.AssetManager;
import android.opengl.GLSurfaceView;
import android.util.Log;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/**
 * Live2D OpenGL 渲染器
 * 移植自 NyaDeskPetAPP (https://github.com/gameswu/NyaDeskPetAPP)
 * 感谢原作者 gameswu 的开源贡献
 */
public class Live2DRenderer implements GLSurfaceView.Renderer {

    private static final String TAG = "Live2DRenderer";

    public static boolean nativeAvailable = false;

    static {
        try {
            System.loadLibrary("live2d_native");
            nativeAvailable = true;
        } catch (UnsatisfiedLinkError e) {
            Log.w(TAG, "Native library not available: " + e.getMessage());
        }
    }

    private final AssetManager assetManager;
    private volatile boolean glInitialized = false;
    public volatile String pendingModelPath = null;
    public Runnable onFrameUpdate = null;

    public Live2DRenderer(AssetManager assetManager) {
        this.assetManager = assetManager;
    }

    public void requestLoadModel(String path) {
        if (glInitialized) {
            nativeLoadModel(assetManager, path);
        } else {
            pendingModelPath = path;
        }
    }

    @Override
    public void onSurfaceCreated(GL10 gl, EGLConfig config) {
        if (!nativeAvailable) return;
        nativeInit(assetManager);        glInitialized = true;
        if (pendingModelPath != null) {
            String path = pendingModelPath;
            pendingModelPath = null;
            Log.i(TAG, "Loading pending model: " + path);
            nativeLoadModel(assetManager, path);
        }
    }

    @Override
    public void onSurfaceChanged(GL10 gl, int width, int height) {
        if (nativeAvailable) nativeOnSurfaceChanged(width, height);
    }

    @Override
    public void onDrawFrame(GL10 gl) {
        if (onFrameUpdate != null) onFrameUpdate.run();
        if (nativeAvailable) nativeOnDrawFrame();
    }

    // JNI
    public native void nativeInit(AssetManager assetManager);
    public native void nativeLoadModel(AssetManager assetManager, String modelPath);
    public native void nativeStartMotion(String group, int index, int priority);
    public native void nativeSetExpression(String expressionId);
    public native void nativeSetParameterValue(String paramId, float value);
    public native void nativeOnDrawFrame();
    public native void nativeOnSurfaceChanged(int width, int height);
    public native void nativeSetModelTransform(float scale, float offsetX, float offsetY);
}
