import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonChip,
  IonRefresher,
  IonRefresherContent,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bluetooth,
  bluetoothOutline,
  search,
  flash,
  checkmarkCircle,
  closeCircle,
  trash,
  refreshOutline,
  gameController
} from 'ionicons/icons';
import { BleDevice } from '@capacitor-community/bluetooth-le';
import { BleService, ButtonPressEvent } from '../services/ble.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonChip,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  isScanning = false;
  isConnecting = false;
  discoveredDevices: BleDevice[] = [];
  buttonPressLog: ButtonPressEvent[] = [];

  constructor(
    private bleService: BleService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({
      bluetooth,
      bluetoothOutline,
      search,
      flash,
      checkmarkCircle,
      closeCircle,
      trash,
      refreshOutline,
      gameController
    });
  }

  async ngOnInit() {
    try {
      await this.bleService.initialize();
    } catch (error) {
      await this.showAlert('BLE Error', 'Failed to initialize Bluetooth. Make sure Bluetooth is enabled.');
    }
  }

  ngOnDestroy() {
    this.bleService.disconnect();
  }

  async startScan() {
    this.isScanning = true;
    this.discoveredDevices = [];

    try {
      await this.bleService.scanForDevices(
        (device) => {
          // Avoid duplicates
          if (!this.discoveredDevices.find(d => d.deviceId === device.deviceId)) {
            this.discoveredDevices = [...this.discoveredDevices, device];
          }
        },
        15000
      );

      // Auto-stop after 15 seconds
      setTimeout(() => {
        this.isScanning = false;
      }, 15000);
    } catch (error) {
      this.isScanning = false;
      await this.showToast('Scan failed. Check Bluetooth permissions.');
    }
  }

  async stopScan() {
    await this.bleService.stopScan();
    this.isScanning = false;
  }

  async connectToDevice(device: BleDevice) {
    this.isConnecting = true;

    try {
      const success = await this.bleService.connect(device);
      if (success) {
        await this.showToast(`Connected to ${device.name || 'device'}`);
        this.startLogRefresh();
      } else {
        await this.showAlert('Connection Failed', 'Could not connect to the device.');
      }
    } catch (error) {
      await this.showAlert('Connection Error', 'An error occurred while connecting.');
    }

    this.isConnecting = false;
  }

  async disconnect() {
    await this.bleService.disconnect();
    await this.showToast('Disconnected');
  }

  private logRefreshInterval: any;

  private startLogRefresh() {
    // Refresh the log every 500ms while connected
    this.logRefreshInterval = setInterval(() => {
      this.buttonPressLog = this.bleService.getButtonPressLog();
    }, 500);
  }

  clearLog() {
    this.bleService.clearLog();
    this.buttonPressLog = [];
  }

  async handleRefresh(event: any) {
    this.buttonPressLog = this.bleService.getButtonPressLog();
    event.target.complete();
  }

  isConnected(): boolean {
    return this.bleService.isConnected();
  }

  getConnectedDevice(): BleDevice | null {
    return this.bleService.getConnectedDevice();
  }

  formatTime(date: Date): string {
    const time = date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${ms}`;
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }
}
