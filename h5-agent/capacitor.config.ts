import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mengqing.firework.agent',
  appName: '蒙庆烟花推销员',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true  // 允许HTTP（生产服务器暂无HTTPS）
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false  // 生产环境关闭调试
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#C41230',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
