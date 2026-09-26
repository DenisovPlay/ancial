import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css"; // force HMR css update
import AppearanceSync from './components/appearance-sync';
import AppRuntime from './components/app-runtime';
import IconSprite from './components/icon-sprite';
import TooltipLayer from './components/tooltip-layer';
import MainContent from './components/main-content';
import Navigation from './components/navigation';
import RichPresenceReporter from './components/rich-presence-reporter';
import SWRegister from './components/sw-register';
import { AuthProvider } from './context/AuthContext';
import { GlobalWSProvider } from './context/GlobalWSProvider';
import { NotificationProvider } from './context/NotificationContext';
import { PulsePlayerProvider } from './context/PulsePlayerContext';
import { APPEARANCE_BOOT_SCRIPT } from './lib/appearance';
import { APP_ROUTE_BOOT_SCRIPT } from './lib/app-route-boot';
import { IS_NATIVE_APP } from './lib/platform';
import { DEFAULT_SEO, SITE_CONFIG } from './seo';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  ...DEFAULT_SEO,
  title: {
    default: SITE_CONFIG.title,
    template: `%s | ${SITE_CONFIG.title}`,
  },
  openGraph: {
    ...DEFAULT_SEO.openGraph,
    title: {
      default: SITE_CONFIG.title,
      template: `%s | ${SITE_CONFIG.title}`,
    },
  },
  other: {
    'google-adsense-account': 'ca-pub-9947484450577422',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Приложение: WebView внутри безопасной зоны (Capacitor SystemBars, insetsHandling: native) —
  // навигация, плееры, шторки и тосты не уходят под статусбар и жестовую панель. Сайт — как был.
  viewportFit: IS_NATIVE_APP ? 'contain' : 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} h-full antialiased`}
      // Настройки стекла и анимаций пишет на <html> скрипт ниже — до гидратации, React их не рендерит.
      suppressHydrationWarning
    >
      <head>
        {/* Приложение: адреса динамических страниц обслуживают заготовки «_» — до запуска Next (см. app-route-boot.ts). */}
        {IS_NATIVE_APP ? <script dangerouslySetInnerHTML={{ __html: APP_ROUTE_BOOT_SCRIPT }} /> : null}
        {/* Своё, без внешних данных: применяет сохранённые на устройстве настройки внешнего вида до первой отрисовки. */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white">
        <AppearanceSync />
        {/*<Script
          id="google-adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9947484450577422"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />*/}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js', 'ym');
        
            ym(95401676, 'init', {
                clickmap:true, 
                referrer: document.referrer, 
                url: location.href, 
                accurateTrackBounce:true, 
                trackLinks:true
            });
          `}
        </Script>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/95401676" style={{ position: "absolute", left: "-9999px" }} alt="" />
          </div>
        </noscript>
        <IconSprite />
        <TooltipLayer />
        <SWRegister />
        <NotificationProvider>
          <AuthProvider>
            <GlobalWSProvider>
              <PulsePlayerProvider>
                <RichPresenceReporter />
                {/* Приложение: кнопка «назад», ссылки сайта, системный браузер, фоновая музыка, проверка версии. */}
                {IS_NATIVE_APP ? <AppRuntime /> : null}
                <Navigation />
                <MainContent>
                  {children}
                </MainContent>
              </PulsePlayerProvider>
            </GlobalWSProvider>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
