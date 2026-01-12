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
  ToastController,
  ModalController
} from '@ionic/angular/standalone';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { GameService } from '../../services/game.service';
import { QuizGame, QuizQuestion } from '../../models/game.models';
import { QuizQuestionModalComponent } from './quiz-question-modal.component';

@Component({
  selector: 'app-quiz-editor',
  templateUrl: 'quiz-editor.page.html',
  styleUrls: ['quiz-editor.page.scss'],
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
export class QuizEditorPage implements OnInit {
  gameId: number | null = null;
  game: QuizGame | null = null;
  gameName = '';
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
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
    if (game && game.type === 'quiz') {
      this.game = game as QuizGame;
      this.gameName = this.game.name;
    }
    this.isLoading = false;
  }

  async saveGameName() {
    if (!this.gameName.trim()) return;

    if (this.gameId) {
      await this.gameService.updateGameName(this.gameId, this.gameName);
    } else {
      this.gameId = await this.gameService.createGame(this.gameName, 'quiz');
      await this.loadGame();
    }
    await this.showToast(this.translate.instant('EDITOR.SAVED'));
  }

  async addQuestion() {
    if (!this.gameId) {
      await this.saveGameName();
    }
    if (!this.gameId) return;

    const modal = await this.modalController.create({
      component: QuizQuestionModalComponent,
      componentProps: {
        question: null
      }
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        await this.gameService.addQuizQuestion(this.gameId!, result.data);
        await this.loadGame();
        await this.showToast(this.translate.instant('EDITOR.QUESTION_ADDED'));
      }
    });

    await modal.present();
  }

  async editQuestion(question: QuizQuestion) {
    const modal = await this.modalController.create({
      component: QuizQuestionModalComponent,
      componentProps: {
        question: { ...question }
      }
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        await this.gameService.updateQuizQuestion(result.data);
        await this.loadGame();
        await this.showToast(this.translate.instant('EDITOR.SAVED'));
      }
    });

    await modal.present();
  }

  async deleteQuestion(question: QuizQuestion) {
    const alert = await this.alertController.create({
      header: this.translate.instant('EDITOR.DELETE_CONFIRM'),
      message: this.translate.instant('EDITOR.DELETE_QUESTION_MSG'),
      buttons: [
        { text: this.translate.instant('ACTIONS.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('EDITOR.DELETE'),
          role: 'destructive',
          handler: async () => {
            if (question.id) {
              await this.gameService.deleteQuizQuestion(question.id);
              await this.loadGame();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  getCorrectAnswerText(question: QuizQuestion): string {
    switch (question.correctAnswer) {
      case 'A': return question.optionA;
      case 'B': return question.optionB;
      case 'C': return question.optionC;
      case 'D': return question.optionD;
      default: return '';
    }
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
