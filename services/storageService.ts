
import { Candidate, Batch, User, UserRole, AuditLog } from '../types';

const API_URL = '/admission-api';

export class StorageService {
  private static useMock = false;
  private static initialized = false;

  static async init() {
    if (this.initialized) return;
    
    const isProduction = window.location.hostname === 'englishhouseacademy.co.in';

    console.log(`[SYSTEM] Initializing Storage Service (Host: ${window.location.hostname})`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(`${API_URL}/status`, { 
        method: 'GET',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        console.log("[SYSTEM] Backend connected:", data);
        
        // If database is not configured on the server, we might still need to show demo
        // unless we are in production and want to force the installer.
        if (data.db === true) {
            this.useMock = false;
            console.log("[SYSTEM] Using Live Database.");
        } else {
            console.warn("[SYSTEM] Backend is alive but Database is NOT configured. Showing Demo Mode.");
            this.useMock = true;
        }
      } else {
        throw new Error(`Server returned ${res.status}`);
      }
    } catch (e: any) {
      console.warn(`[SYSTEM] Backend unreachable: ${e.message}. Falling back to Demo Mode.`);
      this.useMock = true;
    }

    this.initialized = true;
  }

  private static async fetchApi(action: string, body?: any) {
    if (!this.initialized) await this.init();
    if (this.useMock) return this.mockAction(action, body);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body })
      });
      
      if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error(`[API] Fetch Error [${action}]:`, error.message);
      throw error;
    }
  }

  private static mockAction(action: string, body?: any): any {
    const getStorage = (key: string) => JSON.parse(localStorage.getItem(`crm_mock_${key}`) || '[]');
    const setStorage = (key: string, val: any) => localStorage.setItem(`crm_mock_${key}`, JSON.stringify(val));

    switch (action) {
      case 'get_users': 
        const u = getStorage('users');
        return u.length ? u : [{ id: 'admin-01', username: 'admin', name: 'Demo Administrator', role: 'SUPER_ADMIN', isActive: true }];
      case 'get_batches': 
        const b = getStorage('batches');
        return b.length ? b : [{ id: 'batch-1', name: 'Demo Batch 2026', maxSeats: 60, createdAt: Date.now() }];
      case 'get_candidates': return getStorage('candidates');
      case 'save_user':
      case 'save_batch':
      case 'save_candidate':
      case 'delete_user':
      case 'delete_batch':
        // Implementation omitted for brevity in mock
        return { status: 'success' };
      default: return [];
    }
  }

  static async getUsers(): Promise<User[]> { return this.fetchApi('get_users'); }
  static async saveUser(user: User, password?: string) { return this.fetchApi('save_user', { user, password }); }
  static async deleteUser(id: string) { return this.fetchApi('delete_user', { id }); }
  static async getBatches(): Promise<Batch[]> { return this.fetchApi('get_batches'); }
  static async saveBatch(batch: Batch) { return this.fetchApi('save_batch', { batch }); }
  static async deleteBatch(id: string) { return this.fetchApi('delete_batch', { id }); }
  static async getCandidates(): Promise<Candidate[]> { return this.fetchApi('get_candidates'); }
  static async saveCandidate(candidate: Candidate) { return this.fetchApi('save_candidate', { candidate }); }
  static async getAuditLogs(): Promise<AuditLog[]> { return []; }
  static isDemoMode() { return this.useMock; }
}
