import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonFab,
  IonFabButton,
  IonBadge,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { GameService } from '../../services/game.service';
import { WheelGame, WheelSegment, DEFAULT_WHEEL_COLORS } from '../../models/game.models';

@Component({
  selector: 'app-wheel-editor',
  templateUrl: 'wheel-editor.page.html',
  styleUrls: ['wheel-editor.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    FontAwesomeModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonFab,
    IonFabButton,
    IonBadge,
    IonItemSliding,
    IonItemOptions,
    IonItemOption
  ]
})
export class WheelEditorPage implements OnInit {
  gameId: number | null = null;
  game: WheelGame | null = null;
  gameName = '';
  isLoading = true;
  defaultColors = DEFAULT_WHEEL_COLORS;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private alertController: AlertController,
    private toastController: ToastController,
    private translate: TranslateService
  ) {}

  async ngOnInit() {
    await this.gameService.initialize();
    
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.gameId = parseInt(idParam, 10);
      await this.loadGame();
    } else {
      this.isLoading = false;
    }
  }

  async loadGame() {
    if (!this.gameId) return;
    
    const game = await this.gameService.getFullGame(this.gameId);
    if (game && game.type === 'wheel') {
      this.game = game as WheelGame;
      this.gameName = this.game.name;
    }
    this.isLoading = false;
  }

  async saveGameName() {
    if (!this.gameName.trim()) return;

    if (this.gameId) {
      await this.gameService.updateGameName(this.gameId, this.gameName);
    } else {
      this.gameId = await this.gameService.createGame(this.gameName, 'wheel');
      await this.loadGame();
    }
    await this.showToast(this.translate.instant('EDITOR.SAVED'));
  }

  async addSegment() {
    if (!this.gameId) {
      await this.saveGameName();
    }
    if (!this.gameId) return;

    const segmentCount = this.game?.segments?.length || 0;
    const defaultColor = this.defaultColors[segmentCount % this.defaultColors.length];

    const alert = await this.alertController.create({
      header: this.translate.instant('EDITOR.WHEEL.ADD_SEGMENT'),
      inputs: [
        {
          name: 'label',
          type: 'text',
          placeholder: this.translate.instant('EDITOR.WHEEL.LABEL_PLACEHOLDER')
        },
        {
          name: 'value',
          type: 'number',
          placeholder: this.translate.instant('EDITOR.WHEEL.VALUE_PLACEHOLDER')
        },
        {
          name: 'action',
          type: 'text',
          placeholder: this.translate.instant('EDITOR.WHEEL.ACTION_PLACEHOLDER')
        }
      ],
      buttons: [
        { text: this.translate.instant('ACTIONS.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('ACTIONS.OK'),
          handler: async (data) => {
            if (data.label?.trim()) {
              await this.gameService.addWheelSegment(this.gameId!, {
                label: data.label.trim(),
                color: defaultColor,
                value: data.value ? parseInt(data.value, 10) : undefined,
                action: data.action?.trim() || undefined
              });
              await this.loadGame();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async editSegment(segment: WheelSegment) {
    const alert = await this.alertController.create({
      header: this.translate.instant('EDITOR.WHEEL.EDIT_SEGMENT'),
      inputs: [
        {
          name: 'label',
          type: 'text',
          value: segment.label,
          placeholder: this.translate.instant('EDITOR.WHEEL.LABEL_PLACEHOLDER')
        },
        {
          name: 'color',
          type: 'text',
          value: segment.color,
          placeholder: this.translate.instant('EDITOR.WHEEL.COLOR_PLACEHOLDER')
        },
        {
          name: 'value',
          type: 'number',
          value: segment.value?.toString() || '',
          placeholder: this.translate.instant('EDITOR.WHEEL.VALUE_PLACEHOLDER')
        },
        {
          name: 'action',
          type: 'text',
          value: segment.action || '',
          placeholder: this.translate.instant('EDITOR.WHEEL.ACTION_PLACEHOLDER')
        }
      ],
      buttons: [
        { text: this.translate.instant('ACTIONS.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('EDITOR.SAVE'),
          handler: async (data) => {
            if (data.label?.trim() && segment.id) {
              await this.gameService.updateWheelSegment({
                ...segment,
                label: data.label.trim(),
                color: data.color || segment.color,
                value: data.value ? parseInt(data.value, 10) : undefined,
                action: data.action?.trim() || undefined
              });
              await this.loadGame();
              await this.showToast(this.translate.instant('EDITOR.SAVED'));
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteSegment(segment: WheelSegment) {
    const alert = await this.alertController.create({
      header: this.translate.instant('EDITOR.DELETE_CONFIRM'),
      message: `${this.translate.instant('EDITOR.DELETE_SEGMENT_MSG')} "${segment.label}"?`,
      buttons: [
        { text: this.translate.instant('ACTIONS.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('EDITOR.DELETE'),
          role: 'destructive',
          handler: async () => {
            if (segment.id) {
              await this.gameService.deleteWheelSegment(segment.id);
              await this.loadGame();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
