import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from './components/navigation';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
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
        <NotificationProvider>
          <AuthProvider>
            <Navigation />
            <div id="main-content" className="flex-1 flex flex-col pb-20 md:pb-0 md:pl-24 duration-300">
              {children}
            </div>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
