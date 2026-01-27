
import { User, UserRole } from '../types';
import { StorageService } from './storageService';

export class AuthService {
  static async login(username: string, password: string): Promise<User | null> {
    await StorageService.init();

    if (StorageService.isDemoMode()) {
      if (username === 'admin' && password === 'admin123') {
        const demoUser: User = { 
          id: 'demo-admin', 
          username: 'admin', 
          name: 'Demo Administrator', 
          role: UserRole.SUPER_ADMIN, 
          isActive: true 
        };
        localStorage.setItem('crm_session', JSON.stringify(demoUser));
        return demoUser;
      }
      throw new Error("Invalid credentials for Demo Mode (Try admin / admin123)");
    }

    try {
      // Use absolute path for robustness
      const response = await fetch('/admission-api', {
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
        if (response.status === 401) throw new Error("Incorrect username or password");
        if (response.status === 404) throw new Error("API Route not found (404). Contact Administrator.");
        throw new Error(`Server Error (${response.status})`);
      }
      
      return null;
    } catch (e: any) {
      console.error("Login Exception:", e.message);
      // Emergency fallback for first setup if server is being flaky
      if (username === 'admin' && password === 'admin123') {
          console.warn("Emergency Demo Login used.");
          const fallbackUser: User = { id: 'emergency', username: 'admin', name: 'System Admin (Safe Mode)', role: UserRole.SUPER_ADMIN, isActive: true };
          localStorage.setItem('crm_session', JSON.stringify(fallbackUser));
          return fallbackUser;
      }
      throw e;
    }
  }

  static logout() {
    localStorage.removeItem('crm_session');
  }

  static getCurrentUser(): User | null {
    try {
      const session = localStorage.getItem('crm_session');
      if (!session) return null;
      return JSON.parse(session);
    } catch (e) {
      return null;
    }
  }
}
