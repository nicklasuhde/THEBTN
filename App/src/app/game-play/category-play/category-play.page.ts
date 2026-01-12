import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonSpinner,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ScreenOrientation } from '@capacitor/screen-orientation';

import { GameService } from '../../services/game.service';
import { BleService, ButtonPressEvent } from '../../services/ble.service';
import { PlayerService, Player } from '../../services/player.service';
import { CategoryGame, Category, CategoryQuestion } from '../../models/game.models';

interface PlayerScore {
  player: Player;
  score: number;
}

type GameState = 'board' | 'question' | 'buzzer' | 'answer' | 'result';

interface AnsweredQuestion {
  categoryId: number;
  questionId: number;
}

@Component({
  selector: 'app-category-play',
  templateUrl: 'category-play.page.html',
  styleUrls: ['category-play.page.scss'],
  imports: [
    CommonModule,
    TranslatePipe,
    FontAwesomeModule,
    IonContent,
    IonButton,
    IonSpinner
  ]
})
export class CategoryPlayPage implements OnInit, OnDestroy {
  game: CategoryGame | null = null;
  isLoading = true;
  
  // Game state
  gameState: GameState = 'board';
  currentQuestion: CategoryQuestion | null = null;
  currentCategory: Category | null = null;
  buzzedPlayer: Player | null = null;
  showAnswer = false;
  
  // Player scores
  playerScores: PlayerScore[] = [];
  
  // Track answered questions
  answeredQuestions: Set<string> = new Set();
  
  // Countdown timer
  countdown: number = 10;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private readonly COUNTDOWN_SECONDS = 10;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private bleService: BleService,
    private playerService: PlayerService,
    private alertController: AlertController,
    private toastController: ToastController,
    private translate: TranslateService,
    private ngZone: NgZone
  ) {}

  async ngOnInit() {

    
    // Ensure button registration is disabled during game play
    this.bleService.setRegistrationEnabled(false);
    
    await this.loadGame();
    this.initializePlayerScores();
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopCountdown();
    
    // Unlock orientation when leaving (fire and forget)
    this.unlockOrientation();
  }

  private async loadGame() {
    await this.gameService.initialize();
    
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const gameId = parseInt(idParam, 10);
      const game = await this.gameService.getFullGame(gameId);
      if (game && game.type === 'category') {
        this.game = game as CategoryGame;
      }
    }
    this.isLoading = false;
  }

  private initializePlayerScores() {
    const players = this.playerService.getAllPlayers();
    this.playerScores = players.map(player => ({
      player,
      score: 0
    }));
  }

  private setupSubscriptions() {
    // Subscribe to button presses
    this.subscriptions.push(
      this.bleService.buttonPress$.subscribe(event => {
        this.ngZone.run(() => {
          this.handleButtonPress(event);
        });
      })
    );
  }

  private async handleButtonPress(event: ButtonPressEvent) {
    // Only react to button presses when waiting for buzzer
    if (this.gameState === 'question') {
      const player = this.playerService.getPlayerByButtonIdentifier(event.buttonIdentifier);
      if (player) {
        this.stopCountdown();
        this.buzzedPlayer = player;
        this.gameState = 'buzzer';
        
        // Turn on LED for the player who buzzed in
        try {
          await this.bleService.setLedOn(player.buttonIdentifier);
        } catch (error) {
          console.error('Failed to turn on LED:', error);
        }
      }
    }
  }

  // Start the countdown timer
  private startCountdown() {
    this.countdown = this.COUNTDOWN_SECONDS;
    this.stopCountdown(); // Clear any existing interval
    
    this.countdownInterval = setInterval(() => {
      this.ngZone.run(() => {
        this.countdown--;
        
        if (this.countdown <= 0) {
          this.onCountdownExpired();
        }
      });
    }, 1000);
  }

  // Stop the countdown timer
  private stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // Called when countdown reaches zero
  private onCountdownExpired() {
    this.stopCountdown();
    
    // Mark question as done (consumed) and return to board
    if (this.currentCategory && this.currentQuestion) {
      this.answeredQuestions.add(`${this.currentCategory.id}-${this.currentQuestion.id}`);
    }
    
    this.returnToBoard();
  }

  // Check if question has been answered
  isQuestionAnswered(category: Category, question: CategoryQuestion): boolean {
    return this.answeredQuestions.has(`${category.id}-${question.id}`);
  }

  // Select a question from the board
  selectQuestion(category: Category, question: CategoryQuestion) {
    if (this.isQuestionAnswered(category, question)) {
      return; // Already answered
    }
    
    this.currentCategory = category;
    this.currentQuestion = question;
    this.showAnswer = false;
    this.buzzedPlayer = null;
    this.gameState = 'question';
    
    // Start countdown timer
    this.startCountdown();
  }

  // Close question without answering (no one knows the answer)
  async closeQuestion() {
    this.stopCountdown();
    
    // Turn off all LEDs
    try {
      await this.bleService.setAllLedsOff();
    } catch (error) {
      console.error('Failed to turn off LEDs:', error);
    }
    
    this.gameState = 'board';
    this.currentQuestion = null;
    this.currentCategory = null;
    this.buzzedPlayer = null;
    this.showAnswer = false;
  }

  // Show the answer
  revealAnswer() {
    this.showAnswer = true;
    this.gameState = 'answer';
  }

  // Mark answer as correct
  markCorrect() {
    if (this.buzzedPlayer && this.currentQuestion && this.currentCategory) {
      // Add points to player
      const playerScore = this.playerScores.find(ps => ps.player.id === this.buzzedPlayer!.id);
      if (playerScore) {
        playerScore.score += this.currentQuestion.points;
      }
      
      // Mark question as answered
      this.answeredQuestions.add(`${this.currentCategory.id}-${this.currentQuestion.id}`);
      
      this.showToast(`${this.buzzedPlayer.name} +${this.currentQuestion.points} poäng!`);
      
      // Return to board
      this.returnToBoard();
    }
  }

  // Mark answer as incorrect
  async markIncorrect() {
    if (this.buzzedPlayer && this.currentQuestion && this.currentCategory) {
      // Subtract points (but not below 0)
      const playerScore = this.playerScores.find(ps => ps.player.id === this.buzzedPlayer!.id);
      if (playerScore) {
        playerScore.score = Math.max(0, playerScore.score - this.currentQuestion.points);
      }
      
      this.showToast(`${this.buzzedPlayer.name} -${this.currentQuestion.points} poäng!`);
      
      // Mark question as answered/consumed since answer was already shown
      this.answeredQuestions.add(`${this.currentCategory.id}-${this.currentQuestion.id}`);
      
      // Return to board (this will also turn off LEDs)
      await this.returnToBoard();
    }
  }

  // Skip to show answer without penalty (when in buzzer state)
  skipAndShowAnswer() {
    this.revealAnswer();
  }

  // Return to board after a question
  private async returnToBoard() {
    this.stopCountdown();
    
    // Turn off all LEDs when returning to board
    try {
      await this.bleService.setAllLedsOff();
    } catch (error) {
      console.error('Failed to turn off LEDs:', error);
    }
    
    this.gameState = 'board';
    this.currentQuestion = null;
    this.currentCategory = null;
    this.buzzedPlayer = null;
    this.showAnswer = false;
    
    // Check if game is over
    if (this.isGameOver()) {
      this.showGameOver();
    }
  }

  // Mark question as done without correct answer
  markQuestionDone() {
    if (this.currentCategory && this.currentQuestion) {
      this.answeredQuestions.add(`${this.currentCategory.id}-${this.currentQuestion.id}`);
    }
    this.returnToBoard();
  }

  // Check if all questions have been answered
  isGameOver(): boolean {
    if (!this.game) return false;
    
    let totalQuestions = 0;
    for (const category of this.game.categories) {
      totalQuestions += category.questions.length;
    }
    
    return this.answeredQuestions.size >= totalQuestions;
  }

  // Show game over screen
  private async showGameOver() {
    // Sort players by score
    const sortedScores = [...this.playerScores].sort((a, b) => b.score - a.score);
    const winner = sortedScores[0];
    
    const alert = await this.alertController.create({
      header: this.translate.instant('GAME_PLAY.GAME_OVER'),
      message: `🏆 ${winner.player.name} ${this.translate.instant('GAME_PLAY.WINS_WITH')} ${winner.score} ${this.translate.instant('GAME_PLAY.POINTS')}!`,
      buttons: [
        {
          text: this.translate.instant('GAME_PLAY.BACK_TO_MENU'),
          handler: async () => {
            await this.unlockOrientation();
            this.router.navigate(['/play']);
          }
        }
      ],
      backdropDismiss: false
    });
    await alert.present();
  }

  // Exit game
  async exitGame() {
    const alert = await this.alertController.create({
      header: this.translate.instant('GAME_PLAY.EXIT_CONFIRM'),
      message: this.translate.instant('GAME_PLAY.EXIT_MESSAGE'),
      buttons: [
        {
          text: this.translate.instant('ACTIONS.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('GAME_PLAY.EXIT'),
          role: 'destructive',
          handler: async () => {
            await this.unlockOrientation();
            this.router.navigate(['/play']);
          }
        }
      ]
    });
    await alert.present();
  }

  private async unlockOrientation() {
    try {
      await ScreenOrientation.unlock();
    } catch (e) {
      console.log('Could not unlock orientation:', e);
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color: 'dark'
    });
    await toast.present();
  }

  // Get point values sorted
  getPointValues(): number[] {
    if (!this.game?.categories.length) return [];
    return this.game.categories[0].questions.map(q => q.points).sort((a, b) => a - b);
  }

  // Get question by point value for a category
  getQuestionByPoints(category: Category, points: number): CategoryQuestion | undefined {
    return category.questions.find(q => q.points === points);
  }
}
