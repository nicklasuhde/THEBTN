import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
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
  ToastController,
  ActionSheetController
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
  gameController,
  globe,
  language
} from 'ionicons/icons';
import { BleDevice } from '@capacitor-community/bluetooth-le';
import { BleService, ButtonPressEvent } from '../services/ble.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
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
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
    private translate: TranslateService
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
      gameController,
      globe,
      language
    });
  }

  async selectLanguage() {
    const currentLang = this.translate.currentLang;
    
    const actionSheet = await this.actionSheetController.create({
      header: this.translate.instant('LANGUAGE.SELECT'),
      buttons: [
        {
          text: '🇸🇪 Svenska',
          role: currentLang === 'sv' ? 'selected' : undefined,
          handler: () => {
            this.translate.use('sv');
          }
        },
        {
          text: '🇬🇧 English',
          role: currentLang === 'en' ? 'selected' : undefined,
          handler: () => {
            this.translate.use('en');
          }
        },
        {
          text: this.translate.instant('ACTIONS.CANCEL'),
          role: 'cancel'
        }
      ]
    });
    
    await actionSheet.present();
  }

  getCurrentLanguageFlag(): string {
    const lang = this.translate.currentLang || 'sv';
    return lang === 'sv' ? '🇸🇪' : '🇬🇧';
  }

  async ngOnInit() {
    await this.initializeBle();
  }

  async initializeBle() {
    try {
      await this.bleService.initialize();
      await this.showToast(this.translate.instant('BLUETOOTH.READY'));
    } catch (error: any) {
      console.error('BLE init error:', error);
      const alert = await this.alertController.create({
        header: this.translate.instant('BLUETOOTH.ERROR.TITLE'),
        message: this.translate.instant('BLUETOOTH.ERROR.INIT_FAILED'),
        buttons: [
          {
            text: this.translate.instant('ACTIONS.CANCEL'),
            role: 'cancel'
          },
          {
            text: this.translate.instant('ACTIONS.TRY_AGAIN'),
            handler: () => {
              this.initializeBle();
            }
          }
        ]
      });
      await alert.present();
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
      await this.showToast(this.translate.instant('BLUETOOTH.ERROR.SCAN_FAILED'));
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
        const connectedMsg = this.translate.instant('BLUETOOTH.CONNECTED');
        const deviceName = device.name || this.translate.instant('BLUETOOTH.UNKNOWN_DEVICE');
        await this.showToast(`${connectedMsg} ${deviceName}`);
        this.startLogRefresh();
      } else {
        await this.showAlert(
          this.translate.instant('BLUETOOTH.ERROR.TITLE'),
          this.translate.instant('BLUETOOTH.ERROR.CONNECTION_FAILED')
        );
      }
    } catch (error) {
      await this.showAlert(
        this.translate.instant('BLUETOOTH.ERROR.TITLE'),
        this.translate.instant('BLUETOOTH.ERROR.CONNECTION_ERROR')
      );
    }

    this.isConnecting = false;
  }

  async disconnect() {
    await this.bleService.disconnect();
    await this.showToast(this.translate.instant('BLUETOOTH.DISCONNECT'));
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
