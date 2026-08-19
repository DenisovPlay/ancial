import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cc.zypo.app',
  appName: 'Zypo',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#000000',
      style: 'DARK',
      overlaysWebView: false,
    },
  },
};

export default config;
