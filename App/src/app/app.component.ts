import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonMenuToggle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { gameControllerOutline, addCircleOutline, settingsOutline } from 'ionicons/icons';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    IonApp,
    IonRouterOutlet,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonMenuToggle
  ],
})
export class AppComponent {
  constructor(private translate: TranslateService) {
    addIcons({
      gameControllerOutline,
      addCircleOutline,
      settingsOutline
    });
    
    this.translate.addLangs(['sv', 'en']);
    this.translate.setDefaultLang('sv');
    
    const browserLang = this.translate.getBrowserLang();
    const langToUse = browserLang?.match(/en|sv/) ? browserLang : 'sv';
    this.translate.use(langToUse);
  }
}
