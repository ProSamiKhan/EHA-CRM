
import { User } from '../types';

export class AuthService {
  static async login(username: string, password: string): Promise<User | null> {
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
      } else if (response.status === 401) {
        throw new Error("Invalid username or password");
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Server error: ${response.status}`);
      }
      
      return null;
    } catch (e: any) {
      console.error("Login Error:", e.message);
      localStorage.removeItem('crm_session');
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
      if (user && user.id && user.role) {
        return user;
      }
      return null;
    } catch (e) {
      localStorage.removeItem('crm_session');
      return null;
    }
  }
}
