package com.echo.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(FloatingPetPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // 用户回到 App 时自动停止桌宠，避免两个渲染器同时活跃
        if (FloatingPetService.isRunning()) {
            FloatingPetService.stop(this);
        }
    }
}
