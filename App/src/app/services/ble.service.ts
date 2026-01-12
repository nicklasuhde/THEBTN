import { Injectable } from '@angular/core';
import { BleClient, BleDevice, numberToUUID } from '@capacitor-community/bluetooth-le';
import { Subject, BehaviorSubject } from 'rxjs';

export interface ButtonPressEvent {
  timestamp: Date;
  deviceId: string;
  buttonId: number;
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

  // Observable for button press events
  private buttonPressSubject = new Subject<ButtonPressEvent>();
  public buttonPress$ = this.buttonPressSubject.asObservable();

  // Observable for connection state
  private connectionStateSubject = new BehaviorSubject<boolean>(false);
  public connectionState$ = this.connectionStateSubject.asObservable();

  // Track registered button IDs
  private registeredButtons = new Set<number>();
  private buttonRegistrationSubject = new Subject<number>();
  public buttonRegistration$ = this.buttonRegistrationSubject.asObservable();

  constructor() {}

  async initialize(): Promise<void> {
    try {
      // Initialize BLE (this requests permissions on Android)
      await BleClient.initialize({ androidNeverForLocation: true });
      console.log('BLE initialized successfully');

      // Check if Bluetooth is enabled
      const isEnabled = await BleClient.isEnabled();
      console.log('Bluetooth enabled:', isEnabled);

      if (!isEnabled) {
        // Prompt user to enable Bluetooth
        console.log('Requesting user to enable Bluetooth...');
        await BleClient.requestEnable();
      }
    } catch (error) {
      console.error('BLE initialization failed:', error);
      throw error;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Permissions are now handled in initialize()
      // This method can be used to re-check permissions if needed
      const isEnabled = await BleClient.isEnabled();
      return isEnabled;
    } catch (error) {
      console.error('Permission check failed:', error);
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
        this.connectionStateSubject.next(false);
      });

      this.connectedDevice = device;
      this.connectionStateSubject.next(true);
      
      // Register master button (button 0) on connect
      if (!this.registeredButtons.has(0)) {
        this.registeredButtons.add(0);
        this.buttonRegistrationSubject.next(0);
        console.log('Master button registered: 0');
      }
      
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
          const buttonId = this.parseButtonId(data);
          
          const event: ButtonPressEvent = {
            timestamp: new Date(),
            deviceId: this.connectedDevice?.deviceId || 'unknown',
            buttonId: buttonId,
            data: data
          };

          this.buttonPressLog.unshift(event);
          console.log('Button press received:', event);

          // Check if this is a new button we haven't seen before
          if (!this.registeredButtons.has(buttonId)) {
            this.registeredButtons.add(buttonId);
            this.buttonRegistrationSubject.next(buttonId);
            console.log('New button registered:', buttonId);
          }

          // Emit the button press event
          this.buttonPressSubject.next(event);

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
      this.connectionStateSubject.next(false);
      console.log('Disconnected');
    }
  }

  // Clear all registered buttons (for new session)
  clearRegisteredButtons(): void {
    this.registeredButtons.clear();
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

  private parseButtonId(data: string): number {
    // Parse button ID from the data - adjust based on your firmware format
    // Format from firmware: "BTN:X" where X is the button ID
    const match = data.match(/BTN[:\s]*(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    // Try to parse as just a number
    const num = parseInt(data.trim(), 10);
    return isNaN(num) ? 0 : num;
  }
}

