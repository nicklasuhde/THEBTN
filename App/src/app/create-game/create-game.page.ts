import { Component, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonSegment,
  IonSegmentButton,
  IonRefresher,
  IonRefresherContent,
  AlertController
} from '@ionic/angular/standalone';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { GameService } from '../services/game.service';
import { Game, GameType } from '../models/game.models';

@Component({
  selector: 'app-create-game',
  templateUrl: 'create-game.page.html',
  styleUrls: ['create-game.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    FontAwesomeModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonSegment,
    IonSegmentButton,
    IonRefresher,
    IonRefresherContent
  ],
})
export class CreateGamePage implements OnInit, ViewWillEnter {
  games: Game[] = [];
  selectedFilter: 'all' | GameType = 'all';
  isLoading = true;

  gameTypes: { type: GameType; icon: IconName; labelKey: string }[] = [
    { type: 'category', icon: 'th-large', labelKey: 'CREATE_GAME.TYPES.CATEGORY' },
    { type: 'quiz', icon: 'list-ol', labelKey: 'CREATE_GAME.TYPES.QUIZ' },
    { type: 'wheel', icon: 'dharmachakra', labelKey: 'CREATE_GAME.TYPES.WHEEL' }
  ];

  constructor(
    private translate: TranslateService,
    private router: Router,
    private gameService: GameService,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.gameService.initialize();
  }

  // Called every time the page is about to be shown
  async ionViewWillEnter() {
    await this.loadGames();
  }

  async loadGames() {
    this.isLoading = true;
    if (this.selectedFilter === 'all') {
      this.games = await this.gameService.getAllGames();
    } else {
      this.games = await this.gameService.getGamesByType(this.selectedFilter);
    }
    this.isLoading = false;
  }

  async handleRefresh(event: any) {
    await this.loadGames();
    event.target.complete();
  }

  onFilterChange() {
    this.loadGames();
  }

  createNewGame(type: GameType) {
    const editorPath = this.getEditorPath(type, 'new');
    this.router.navigate([editorPath]);
  }

  editGame(game: Game) {
    const editorPath = this.getEditorPath(game.type, game.id!.toString());
    this.router.navigate([editorPath]);
  }

  async deleteGame(game: Game) {
    const alert = await this.alertController.create({
      header: this.translate.instant('EDITOR.DELETE_CONFIRM'),
      message: `${this.translate.instant('CREATE_GAME.DELETE_MSG')} "${game.name}"?`,
      buttons: [
        { text: this.translate.instant('ACTIONS.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('EDITOR.DELETE'),
          role: 'destructive',
          handler: async () => {
            if (game.id) {
              await this.gameService.deleteGame(game.id);
              await this.loadGames();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private getEditorPath(type: GameType, id: string): string {
    switch (type) {
      case 'category':
        return `/editor/category/${id}`;
      case 'quiz':
        return `/editor/quiz/${id}`;
      case 'wheel':
        return `/editor/wheel/${id}`;
    }
  }

  getGameTypeIcon(type: GameType): [IconPrefix, IconName] {
    const icons: Record<GameType, IconName> = {
      'category': 'th-large',
      'quiz': 'list-ol',
      'wheel': 'dharmachakra'
    };
    return ['fas', icons[type]];
  }

  getGameTypeLabel(type: GameType): string {
    const typeConfig = this.gameTypes.find(t => t.type === type);
    return typeConfig ? this.translate.instant(typeConfig.labelKey) : type;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
}
