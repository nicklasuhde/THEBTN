import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonItem,
  IonInput,
  IonButton,
  IonSpinner,
  IonText,
  IonIcon,
  IonButtons,
  IonBackButton,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAdd, mail, lockClosed, person } from 'ionicons/icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslatePipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
    IonSpinner,
    IonText,
    IonIcon,
    IonButtons,
    IonBackButton
  ]
})
export class RegisterPage {
  email = '';
  password = '';
  confirmPassword = '';
  firstName = '';
  lastName = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private translate: TranslateService
  ) {
    addIcons({ personAdd, mail, lockClosed, person });
  }

  async onRegister() {
    if (!this.email || !this.password || !this.confirmPassword) {
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = this.translate.instant('AUTH.PASSWORDS_MISMATCH');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register({
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName
    }).subscribe({
      next: async (response) => {
        this.isLoading = false;
        if (response.success) {
          await this.showSuccessAlert();
        } else {
          this.errorMessage = response.message || 'Registration failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'An error occurred';
      }
    });
  }

  private async showSuccessAlert() {
    const alert = await this.alertController.create({
      header: this.translate.instant('AUTH.VERIFICATION_SENT'),
      message: this.translate.instant('AUTH.CHECK_EMAIL'),
      buttons: [
        {
          text: this.translate.instant('ACTIONS.OK'),
          handler: () => {
            this.router.navigate(['/auth/login']);
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
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }
}
