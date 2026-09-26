package cc.zypo.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Локальные плагины регистрируются до super.onCreate: там Capacitor создаёт мост и грузит страницу.
        registerPlugin(ZypoWebViewPlugin.class);
        // Никаких обращений к окну (EdgeToEdge.enable и т.п.) до super.onCreate: decorView создался бы со стартовой
        // темой (сплэш) и в окно встроился бы системный ActionBar с заголовком «Zypo» — BridgeActivity переключает
        // тему на AppTheme.NoActionBar только внутри onCreate. От края до края и отступы — SystemBars (capacitor.config.ts).
        super.onCreate(savedInstanceState);
    }
}
