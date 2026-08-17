import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zapatera.resident',
  appName: 'Zapatera Resident',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
