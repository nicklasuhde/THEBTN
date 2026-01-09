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
    }
  }
};

export default config;
