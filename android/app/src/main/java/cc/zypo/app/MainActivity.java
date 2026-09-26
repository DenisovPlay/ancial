package cc.zypo.app;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // От края до края (Android 15+ включает это сам); WebView при этом держится внутри безопасной
        // зоны — SystemBars (insetsHandling: native) + viewport-fit=contain, см. capacitor.config.ts.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
