import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'play',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard]
  },
  {
    path: 'play/category/:id',
    loadComponent: () => import('./game-play/category-play/category-play.page').then((m) => m.CategoryPlayPage),
    canActivate: [authGuard]
  },
  {
    path: 'create-game',
    loadComponent: () => import('./create-game/create-game.page').then((m) => m.CreateGamePage),
    canActivate: [authGuard]
  },
  {
    path: 'editor/category/:id',
    loadComponent: () => import('./editors/category-editor/category-editor.page').then((m) => m.CategoryEditorPage),
    canActivate: [authGuard]
  },
  {
    path: 'editor/quiz/:id',
    loadComponent: () => import('./editors/quiz-editor/quiz-editor.page').then((m) => m.QuizEditorPage),
    canActivate: [authGuard]
  },
  {
    path: 'editor/wheel/:id',
    loadComponent: () => import('./editors/wheel-editor/wheel-editor.page').then((m) => m.WheelEditorPage),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.page').then((m) => m.SettingsPage),
    canActivate: [authGuard]
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./auth/login/login.page').then(m => m.LoginPage),
    canActivate: [publicGuard]
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./auth/register/register.page').then(m => m.RegisterPage),
    canActivate: [publicGuard]
  },
  {
    path: '',
    redirectTo: 'play',
    pathMatch: 'full'
  },
  {
    path: 'home',
    redirectTo: 'play',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'play'
  }
];
