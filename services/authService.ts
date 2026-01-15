
import { User } from '../types';

export class AuthService {
  static async login(username: string, password: string): Promise<User | null> {
    try {
      const response = await fetch('/api-v1-admission', {
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
      }
      
      // Clear session if login fails
      localStorage.removeItem('crm_session');
      return null;
    } catch (e) {
      console.error("Login request failed", e);
      localStorage.removeItem('crm_session');
      return null;
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
      // Basic validation to ensure the object is a valid User
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
