
import { User, UserRole } from '../types';
import { StorageService } from './storageService';

export class AuthService {
  static async login(username: string, password: string): Promise<User | null> {
    if (StorageService.isDemoMode()) {
      if (username === 'admin' && password === 'admin123') {
        const demoUser: User = { id: 'demo-admin', username: 'admin', name: 'Demo Administrator', role: UserRole.SUPER_ADMIN, isActive: true };
        localStorage.setItem('crm_session', JSON.stringify(demoUser));
        return demoUser;
      }
      throw new Error("Invalid credentials (Demo Mode)");
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
        if (response.status === 404) throw new Error("API Endpoint not found. Verify server.js is running.");
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`Server Error (${response.status}): ${text.substring(0, 50)}`);
      }
      
      return null;
    } catch (e: any) {
      console.error("Login Error:", e.message);
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
