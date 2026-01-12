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
  IonAccordionGroup,
  IonAccordion,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { GameService } from '../../services/game.service';
import { CategoryGame, Category, CategoryQuestion, CATEGORY_POINT_VALUES } from '../../models/game.models';

@Component({
  selector: 'app-category-editor',
  templateUrl: 'category-editor.page.html',
  styleUrls: ['category-editor.page.scss'],
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
    IonAccordionGroup,
    IonAccordion
  ]
})
export class CategoryEditorPage implements OnInit {
  gameId: number | null = null;
  game: CategoryGame | null = null;
  gameName = '';
  isLoading = true;
  pointValues = CATEGORY_POINT_VALUES;

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
    if (game && game.type === 'category') {
      this.game = game as CategoryGame;
      this.gameName = this.game.name;
    }
    this.isLoading = false;
  }

  async saveGameName() {
    if (!this.gameName.trim()) return;

    if (this.gameId) {
      await this.gameService.updateGameName(this.gameId, this.gameName);
    } else {
      this.gameId = await this.gameService.createGame(this.gameName, 'category');
      await this.loadGame();
    }
    await this.showToast(this.translate.instant('EDITOR.SAVED'));
  }

  async addCategory() {
    if (!this.gameId) {
      await this.saveGameName();
    }
    if (!this.gameId) return;

    const alert = await this.alertController.create({
      header: this.translate.instant('EDITOR.CATEGORY.ADD'),
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: this.translate.instant('EDITOR.CATEGORY.NAME_PLACEHOLDER')
        }
      ],
      buttons: [
        { text: this.translate.instant('ACTIONS.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('ACTIONS.OK'),
          handler: async (data) => {
            if (data.name?.trim()) {
              await this.gameService.addCategory(this.gameId!, data.name.trim());
              await this.loadGame();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async editCategoryName(category: Category) {
    const alert = await this.alertController.create({
      header: this.translate.instant('EDITOR.CATEGORY.EDIT'),
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: category.name,
          placeholder: this.translate.instant('EDITOR.CATEGORY.NAME_PLACEHOLDER')
        }
      ],
      buttons: [
        { text: this.translate.instant('ACTIONS.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('ACTIONS.OK'),
          handler: async (data) => {
            if (data.name?.trim() && category.id) {
              await this.gameService.updateCategory(category.id, data.name.trim());
              await this.loadGame();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteCategory(category: Category) {
    const alert = await this.alertController.create({
      header: this.translate.instant('EDITOR.DELETE_CONFIRM'),
      message: `${this.translate.instant('EDITOR.DELETE_CATEGORY_MSG')} "${category.name}"?`,
      buttons: [
        { text: this.translate.instant('ACTIONS.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('EDITOR.DELETE'),
          role: 'destructive',
          handler: async () => {
            if (category.id) {
              await this.gameService.deleteCategory(category.id);
              await this.loadGame();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async editQuestion(question: CategoryQuestion) {
    const alert = await this.alertController.create({
      header: `${question.points} ${this.translate.instant('EDITOR.CATEGORY.POINTS')}`,
      inputs: [
        {
          name: 'question',
          type: 'textarea',
          value: question.question,
          placeholder: this.translate.instant('EDITOR.QUESTION_PLACEHOLDER')
        },
        {
          name: 'answer',
          type: 'textarea',
          value: question.answer,
          placeholder: this.translate.instant('EDITOR.ANSWER_PLACEHOLDER')
        }
      ],
      buttons: [
        { text: this.translate.instant('ACTIONS.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('EDITOR.SAVE'),
          handler: async (data) => {
            if (question.id) {
              await this.gameService.updateCategoryQuestion(
                question.id,
                data.question || '',
                data.answer || ''
              );
              await this.loadGame();
              await this.showToast(this.translate.instant('EDITOR.SAVED'));
            }
          }
        }
      ]
    });
    await alert.present();
  }

  getQuestionStatus(question: CategoryQuestion): 'complete' | 'partial' | 'empty' {
    if (question.question && question.answer) return 'complete';
    if (question.question || question.answer) return 'partial';
    return 'empty';
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
