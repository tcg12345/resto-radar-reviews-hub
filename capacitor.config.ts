import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9ea7ee3751d74c739996151c583fbc61',
  appName: 'resto-radar-reviews-hub',
  webDir: 'dist',
  server: {
    url: 'https://9ea7ee37-51d7-4c73-9996-151c583fbc61.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    CapacitorCalendar: {
      permissions: ['calendar']
    }
  }
};

export default config;