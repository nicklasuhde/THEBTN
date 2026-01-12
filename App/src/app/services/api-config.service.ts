import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  
  /**
   * Returns the API URL.
   * 
   * Development: Uses '/api' (relative) - the dev server proxy forwards to backend
   * Production: Uses the configured production API URL
   * 
   * Note: CapacitorHttp must be disabled in capacitor.config.ts for the proxy
   * to work on native platforms during live reload.
   */
  getApiUrl(): string {
    return environment.apiUrl;
  }
}
