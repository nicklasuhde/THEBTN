import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thebtn.app',
  appName: 'THE BTN',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Searching for Quiz Master...',
        cancel: 'Cancel',
        availableDevices: 'Available Devices',
        noDeviceFound: 'No Quiz Master found'
      }
    },
    CapacitorHttp: {
      enabled: false  // Disabled to allow proxy to work during development
    },
    CapacitorCookies: {
      enabled: true
    }
  }
};

export default config;
