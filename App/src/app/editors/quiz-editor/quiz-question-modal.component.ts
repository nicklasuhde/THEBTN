import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonInput,
  IonTextarea,
  IonRadioGroup,
  IonRadio,
  ModalController
} from '@ionic/angular/standalone';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { QuizQuestion } from '../../models/game.models';

@Component({
  selector: 'app-quiz-question-modal',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">{{ 'ACTIONS.CANCEL' | translate }}</ion-button>
        </ion-buttons>
        <ion-title>{{ (isEditing ? 'EDITOR.QUIZ.EDIT_QUESTION' : 'EDITOR.QUIZ.ADD_QUESTION') | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="save()" [disabled]="!isValid()">
            {{ 'EDITOR.SAVE' | translate }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <ion-list>
        <ion-item>
          <ion-textarea
            [(ngModel)]="formData.question"
            [label]="('EDITOR.QUESTION_PLACEHOLDER' | translate)"
            labelPlacement="floating"
            [autoGrow]="true"
            rows="3"
          ></ion-textarea>
        </ion-item>
        
        <ion-radio-group [(ngModel)]="formData.correctAnswer">
          <ion-item>
            <ion-radio slot="start" value="A"></ion-radio>
            <ion-input
              [(ngModel)]="formData.optionA"
              [label]="'A'"
              labelPlacement="floating"
            ></ion-input>
          </ion-item>
          
          <ion-item>
            <ion-radio slot="start" value="B"></ion-radio>
            <ion-input
              [(ngModel)]="formData.optionB"
              [label]="'B'"
              labelPlacement="floating"
            ></ion-input>
          </ion-item>
          
          <ion-item>
            <ion-radio slot="start" value="C"></ion-radio>
            <ion-input
              [(ngModel)]="formData.optionC"
              [label]="'C'"
              labelPlacement="floating"
            ></ion-input>
          </ion-item>
          
          <ion-item>
            <ion-radio slot="start" value="D"></ion-radio>
            <ion-input
              [(ngModel)]="formData.optionD"
              [label]="'D'"
              labelPlacement="floating"
            ></ion-input>
          </ion-item>
        </ion-radio-group>
        
        <ion-item>
          <ion-input
            type="number"
            [(ngModel)]="formData.timeLimit"
            [label]="('EDITOR.QUIZ.TIME_LIMIT' | translate)"
            labelPlacement="floating"
            [placeholder]="('EDITOR.QUIZ.TIME_LIMIT_HINT' | translate)"
          ></ion-input>
        </ion-item>
      </ion-list>
      
      <p class="hint">{{ 'EDITOR.QUIZ.SELECT_CORRECT' | translate }}</p>
    </ion-content>
  `,
  styles: [`
    .hint {
      text-align: center;
      color: var(--ion-color-medium);
      font-size: 0.9rem;
      margin-top: 1rem;
    }
    
    ion-radio-group ion-item {
      --padding-start: 0;
    }
  `],
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
    IonButton,
    IonList,
    IonItem,
    IonInput,
    IonTextarea,
    IonRadioGroup,
    IonRadio
  ]
})
export class QuizQuestionModalComponent implements OnInit {
  @Input() question: QuizQuestion | null = null;
  
  isEditing = false;
  formData: QuizQuestion = {
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A'
  };

  constructor(
    private modalController: ModalController,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    if (this.question) {
      this.isEditing = true;
      this.formData = { ...this.question };
    }
  }

  isValid(): boolean {
    return !!(
      this.formData.question?.trim() &&
      this.formData.optionA?.trim() &&
      this.formData.optionB?.trim() &&
      this.formData.optionC?.trim() &&
      this.formData.optionD?.trim() &&
      this.formData.correctAnswer
    );
  }

  async dismiss() {
    await this.modalController.dismiss();
  }

  async save() {
    if (this.isValid()) {
      await this.modalController.dismiss(this.formData);
    }
  }
}
