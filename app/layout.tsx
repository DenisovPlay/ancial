import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import IconSprite from './components/icon-sprite';
import MainContent from './components/main-content';
import Navigation from './components/navigation';
import SWRegister from './components/sw-register';
import { AuthProvider } from './context/AuthContext';
import { GlobalWSProvider } from './context/GlobalWSProvider';
import { NotificationProvider } from './context/NotificationContext';
import { PulsePlayerProvider } from './context/PulsePlayerContext';
import { DEFAULT_SEO, SITE_CONFIG } from './seo';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
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
        <SWRegister />
        <NotificationProvider>
          <AuthProvider>
            <GlobalWSProvider>
              <PulsePlayerProvider>
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
