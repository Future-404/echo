package com.echo.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(FloatingPetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
