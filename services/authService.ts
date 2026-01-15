import { User } from '../types';

export class AuthService {
  static async login(username: string, password: string): Promise<User | null> {
    try {
      const response = await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('crm_session', JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch (e) {
      console.error("Login failed", e);
      return null;
    }
  }

  static logout() {
    localStorage.removeItem('crm_session');
  }

  static getCurrentUser(): User | null {
    const session = localStorage.getItem('crm_session');
    return session ? JSON.parse(session) : null;
  }
}
