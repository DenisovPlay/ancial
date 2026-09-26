package cc.zypo.app;

import android.webkit.WebView;

import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Collections;

/**
 * Настройки WebView, которые нужно применить до загрузки первой страницы: Capacitor вызывает load()
 * плагинов раньше, чем открывает приложение (Bridge: registerAllPlugins → loadWebView).
 *
 * Passkeys (WebAuthn): WebView отдаёт запросы Credential Manager от имени приложения
 * (WEB_AUTHENTICATION_SUPPORT_FOR_APP). Право на RP ID zypo.cc проверяется по assetlinks.json сайта
 * (relation delegate_permission/common.get_login_creds). Страница узнаёт, что passkeys доступны, по
 * window.__ZYPO_WEBAUTHN__ — без него в WebView есть PublicKeyCredential, но вызовы бы падали.
 */
@CapacitorPlugin(name = "ZypoWebView")
public class ZypoWebViewPlugin extends Plugin {
    @Override
    public void load() {
        WebView webView = getBridge().getWebView();
        if (webView == null || !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_AUTHENTICATION)) {
            return;
        }
        WebSettingsCompat.setWebAuthenticationSupport(
            webView.getSettings(),
            WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_APP
        );
        boolean enabled = WebSettingsCompat.getWebAuthenticationSupport(webView.getSettings())
            == WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_APP;
        if (enabled && WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(
                webView,
                "window.__ZYPO_WEBAUTHN__ = true;",
                Collections.singleton("*")
            );
        }
    }
}
