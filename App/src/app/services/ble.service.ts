import { Injectable } from '@angular/core';
import { BleClient, BleDevice, numberToUUID } from '@capacitor-community/bluetooth-le';

export interface ButtonPressEvent {
  timestamp: Date;
  deviceId: string;
  buttonId: string;
  data: string;
}

@Injectable({
  providedIn: 'root'
})
export class BleService {
  // UUIDs from the Arduino firmware
  private readonly SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
  private readonly CMD_UUID = numberToUUID(0xabcd);
  private readonly STATUS_UUID = numberToUUID(0xdcba);

  private connectedDevice: BleDevice | null = null;
  private buttonPressLog: ButtonPressEvent[] = [];

  constructor() {}

  async initialize(): Promise<void> {
    try {
      await BleClient.initialize();
      console.log('BLE initialized successfully');
    } catch (error) {
      console.error('BLE initialization failed:', error);
      throw error;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Request Bluetooth permissions (needed for Android)
      await BleClient.requestLEScan({ services: [] }, () => {});
      await BleClient.stopLEScan();
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  async scanForDevices(
    onDeviceFound: (device: BleDevice) => void,
    duration: number = 10000
  ): Promise<void> {
    const discoveredDevices = new Set<string>();

    await BleClient.requestLEScan(
      {
        services: [this.SERVICE_UUID],
        allowDuplicates: false
      },
      (result) => {
        if (result.device && !discoveredDevices.has(result.device.deviceId)) {
          discoveredDevices.add(result.device.deviceId);
          console.log('Device found:', result.device);
          onDeviceFound(result.device);
        }
      }
    );

    // Stop scanning after duration
    setTimeout(async () => {
      await BleClient.stopLEScan();
    }, duration);
  }

  async stopScan(): Promise<void> {
    await BleClient.stopLEScan();
  }

  async connect(device: BleDevice): Promise<boolean> {
    try {
      await BleClient.connect(device.deviceId, (deviceId) => {
        console.log('Device disconnected:', deviceId);
        this.connectedDevice = null;
      });

      this.connectedDevice = device;
      console.log('Connected to device:', device.name);

      // Subscribe to button press notifications
      await this.subscribeToButtonPresses();

      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }

  private async subscribeToButtonPresses(): Promise<void> {
    if (!this.connectedDevice) return;

    try {
      await BleClient.startNotifications(
        this.connectedDevice.deviceId,
        this.SERVICE_UUID,
        this.STATUS_UUID,
        (value) => {
          const data = this.dataViewToString(value);
          const event: ButtonPressEvent = {
            timestamp: new Date(),
            deviceId: this.connectedDevice?.deviceId || 'unknown',
            buttonId: this.parseButtonId(data),
            data: data
          };

          this.buttonPressLog.unshift(event);
          console.log('Button press received:', event);

          // Keep only the last 100 events
          if (this.buttonPressLog.length > 100) {
            this.buttonPressLog.pop();
          }
        }
      );

      console.log('Subscribed to button press notifications');
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await BleClient.stopNotifications(
          this.connectedDevice.deviceId,
          this.SERVICE_UUID,
          this.STATUS_UUID
        );
      } catch (e) {
        // Ignore if already stopped
      }

      await BleClient.disconnect(this.connectedDevice.deviceId);
      this.connectedDevice = null;
      console.log('Disconnected');
    }
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(command);

    await BleClient.write(
      this.connectedDevice.deviceId,
      this.SERVICE_UUID,
      this.CMD_UUID,
      new DataView(data.buffer)
    );

    console.log('Command sent:', command);
  }

  getButtonPressLog(): ButtonPressEvent[] {
    return this.buttonPressLog;
  }

  clearLog(): void {
    this.buttonPressLog = [];
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  getConnectedDevice(): BleDevice | null {
    return this.connectedDevice;
  }

  private dataViewToString(dataView: DataView): string {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(dataView.buffer);
  }

  private parseButtonId(data: string): string {
    // Parse button ID from the data - adjust based on your firmware format
    // For now, return the raw data or extract button number
    const match = data.match(/BTN(\d+)/);
    return match ? match[1] : data;
  }
}

