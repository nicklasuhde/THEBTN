import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private translate: TranslateService) {
    this.translate.addLangs(['sv', 'en']);
    this.translate.setDefaultLang('sv');
    
    const browserLang = this.translate.getBrowserLang();
    const langToUse = browserLang?.match(/en|sv/) ? browserLang : 'sv';
    this.translate.use(langToUse);
  }
}
