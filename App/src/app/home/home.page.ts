import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonMenuButton,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonChip,
  IonRefresher,
  IonRefresherContent,
  IonInput,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BleDevice } from '@capacitor-community/bluetooth-le';
import { BleService, ButtonPressEvent } from '../services/ble.service';
import { PlayerService, Player } from '../services/player.service';
import { GameService } from '../services/game.service';
import { Game, GameType } from '../models/game.models';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    FontAwesomeModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonMenuButton,
    IonList,
    IonItem,
    IonLabel,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonChip,
    IonRefresher,
    IonRefresherContent,
    IonInput,
    RouterLink,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  isScanning = false;
  isConnecting = false;
  discoveredDevices: BleDevice[] = [];
  buttonPressLog: ButtonPressEvent[] = [];
  
  // Player management
  players: Player[] = [];
  editingPlayerId: number | null = null;
  editingPlayerName = '';
  
  // Game selection
  games: Game[] = [];
  selectedGame: Game | null = null;
  isLoadingGames = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private bleService: BleService,
    private playerService: PlayerService,
    private gameService: GameService,
    private alertController: AlertController,
    private toastController: ToastController,
    private translate: TranslateService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.initializeBle();
    await this.loadGames();
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // Subscribe to player changes
    this.subscriptions.push(
      this.playerService.players$.subscribe(players => {
        this.players = players;
      })
    );

    // Subscribe to button registrations
    this.subscriptions.push(
      this.bleService.buttonRegistration$.subscribe(buttonId => {
        if (buttonId === 0) {
          this.playerService.registerMasterButton();
        } else {
          this.playerService.registerClientButton(buttonId);
        }
        this.showToast(
          this.translate.instant('PLAYERS.NEW_PLAYER_CONNECTED', { id: buttonId })
        );
      })
    );

    // Subscribe to button presses
    this.subscriptions.push(
      this.bleService.buttonPress$.subscribe(event => {
        const player = this.playerService.getPlayerByButtonId(event.buttonId);
        if (player) {
          console.log(`Button press from: ${player.name} (Button ${event.buttonId})`);
        }
        this.buttonPressLog = this.bleService.getButtonPressLog();
      })
    );

    // Subscribe to connection state
    this.subscriptions.push(
      this.bleService.connectionState$.subscribe(isConnected => {
        if (!isConnected) {
          this.playerService.disconnectMaster();
        }
      })
    );
  }

  async loadGames() {
    this.isLoadingGames = true;
    await this.gameService.initialize();
    this.games = await this.gameService.getAllGames();
    this.isLoadingGames = false;
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
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.bleService.disconnect();
  }

  async startScan() {
    this.isScanning = true;
    this.discoveredDevices = [];

    try {
      await this.bleService.scanForDevices(
        (device) => {
          if (!this.discoveredDevices.find(d => d.deviceId === device.deviceId)) {
            this.discoveredDevices = [...this.discoveredDevices, device];
          }
        },
        15000
      );

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
    this.bleService.clearRegisteredButtons();
    this.playerService.clearPlayers();
    await this.showToast(this.translate.instant('BLUETOOTH.DISCONNECT'));
  }

  // Player editing
  startEditPlayer(player: Player) {
    this.editingPlayerId = player.id;
    this.editingPlayerName = player.name;
  }

  savePlayerName(player: Player) {
    if (this.editingPlayerName.trim()) {
      this.playerService.renamePlayer(player.id, this.editingPlayerName.trim());
    }
    this.editingPlayerId = null;
    this.editingPlayerName = '';
  }

  cancelEditPlayer() {
    this.editingPlayerId = null;
    this.editingPlayerName = '';
  }

  // Game selection
  selectGame(game: Game) {
    this.selectedGame = game;
  }

  deselectGame() {
    this.selectedGame = null;
  }

  async startGame() {
    if (!this.selectedGame || this.players.length === 0) {
      await this.showAlert(
        this.translate.instant('PLAY.ERROR'),
        this.translate.instant('PLAY.SELECT_GAME_AND_PLAYERS')
      );
      return;
    }

    // TODO: Navigate to game play screen with selected game and players
    await this.showToast(
      this.translate.instant('PLAY.STARTING_GAME', { name: this.selectedGame.name })
    );
    
    // For now, just show alert - implement game play screen later
    await this.showAlert(
      this.translate.instant('PLAY.GAME_READY'),
      this.translate.instant('PLAY.GAME_READY_MSG', { 
        game: this.selectedGame.name,
        players: this.players.map(p => p.name).join(', ')
      })
    );
  }

  handleRefresh(event: any) {
    this.loadGames().then(() => {
      event.target.complete();
    });
  }

  clearLog() {
    this.bleService.clearLog();
    this.buttonPressLog = [];
  }

  isConnected(): boolean {
    return this.bleService.isConnected();
  }

  getConnectedDevice(): BleDevice | null {
    return this.bleService.getConnectedDevice();
  }

  getGameTypeIcon(type: GameType): [IconPrefix, IconName] {
    const icons: Record<GameType, IconName> = {
      'category': 'th-large',
      'quiz': 'list-ol',
      'wheel': 'dharmachakra'
    };
    return ['fas', icons[type]];
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
