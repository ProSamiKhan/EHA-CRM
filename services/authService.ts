
import { User } from '../types';
import { StorageService } from './storageService';

export class AuthService {
  static async login(username: string, password: string): Promise<User | null> {
    await StorageService.init();

    try {
      const response = await fetch('/api-v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.user) {
          localStorage.setItem('crm_session', JSON.stringify(data.user));
          return data.user;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Authentication failed");
      }
    } catch (e: any) {
      console.error("Login request failed:", e);
      throw new Error(e.message || "Server connection failed. Please contact administrator.");
    }

    return null;
  }

  static logout() { 
    localStorage.removeItem('crm_session'); 
  }

  static getCurrentUser(): User | null {
    try { 
      const session = localStorage.getItem('crm_session');
      return session ? JSON.parse(session) : null; 
    } catch { 
      return null; 
    }
  }
}
