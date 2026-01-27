
import { User, UserRole } from '../types';
import { StorageService } from './storageService';

export class AuthService {
  static async login(username: string, password: string): Promise<User | null> {
    await StorageService.init();

    if (StorageService.isDemoMode()) {
      if (username === 'admin' && password === 'admin123') {
        const user = { id: 'demo', username: 'admin', name: 'Demo Admin', role: UserRole.SUPER_ADMIN, isActive: true };
        localStorage.setItem('crm_session', JSON.stringify(user));
        return user;
      }
      throw new Error("Invalid demo credentials");
    }

    const response = await fetch('/_api_', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        localStorage.setItem('crm_session', JSON.stringify(data.user));
        return data.user;
      }
    }
    throw new Error("Invalid credentials");
  }

  static logout() { localStorage.removeItem('crm_session'); }
  static getCurrentUser(): User | null {
    try { return JSON.parse(localStorage.getItem('crm_session') || 'null'); } catch { return null; }
  }
}
