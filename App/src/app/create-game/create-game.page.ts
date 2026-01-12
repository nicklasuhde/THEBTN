import { Component } from '@angular/core';
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
  IonIcon,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, gameControllerOutline, peopleOutline, playOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-create-game',
  templateUrl: 'create-game.page.html',
  styleUrls: ['create-game.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonInput,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent
  ],
})
export class CreateGamePage {
  gameName = '';
  
  constructor(
    private translate: TranslateService,
    private router: Router
  ) {
    addIcons({
      addCircleOutline,
      gameControllerOutline,
      peopleOutline,
      playOutline
    });
  }

  createGame() {
    if (this.gameName.trim()) {
      // TODO: Implement game creation logic
      console.log('Creating game:', this.gameName);
      this.router.navigate(['/play']);
    }
  }
}
