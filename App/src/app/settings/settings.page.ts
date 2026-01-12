import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  ActionSheetController,
  AlertController
} from '@ionic/angular/standalone';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  imports: [
    CommonModule,
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
    IonMenuButton
  ],
})
export class SettingsPage {
  constructor(
    private translate: TranslateService,
    private authService: AuthService,
    private router: Router,
    private actionSheetController: ActionSheetController,
    private alertController: AlertController
  ) {}

  getCurrentLanguageLabel(): string {
    const lang = this.translate.currentLang || 'sv';
    return lang === 'sv' ? 'Svenska' : 'English';
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

  async logout() {
    const alert = await this.alertController.create({
      header: this.translate.instant('AUTH.LOGOUT'),
      message: this.translate.instant('AUTH.LOGOUT_CONFIRM'),
      buttons: [
        {
          text: this.translate.instant('ACTIONS.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('AUTH.LOGOUT'),
          handler: () => {
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  getUserEmail(): string {
    const user = this.authService.getCurrentUser();
    return user?.email || '';
  }
}
