
import { User, UserRole } from '../types';
import { StorageService } from './storageService';

export class AuthService {
  static async login(username: string, password: string): Promise<User | null> {
    // Force storage service to init if it hasn't already
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
        if (response.status === 404) throw new Error("API Route not found (404). Switching to Demo Mode.");
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`Server Error (${response.status})`);
      }
      
      return null;
    } catch (e: any) {
      console.error("Auth Exception:", e.message);
      // If server is hard-offline, allow demo login
      if (username === 'admin' && password === 'admin123') {
          console.warn("Server unreachable. Entering emergency Demo Mode.");
          const fallbackUser: User = { id: 'emergency-demo', username: 'admin', name: 'Demo Admin (Offline)', role: UserRole.SUPER_ADMIN, isActive: true };
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
      const user = JSON.parse(session);
      return (user && user.id && user.role) ? user : null;
    } catch (e) {
      localStorage.removeItem('crm_session');
      return null;
    }
  }
}
