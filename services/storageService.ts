
import { Candidate, Batch, User, UserRole, AuditLog } from '../types';

const API_URL = '/_api_';

export class StorageService {
  private static useMock = false;
  private static initialized = false;

  static async init() {
    if (this.initialized) return;
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        this.useMock = !data.configured;
      } else {
        this.useMock = true;
      }
    } catch {
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
      return await response.json();
    } catch (error: any) {
      throw error;
    }
  }

  // Handle mock actions for demo mode and unmapped actions
  private static mockAction(action: string, body?: any): any {
    const getStorage = (key: string) => JSON.parse(localStorage.getItem(`crm_mock_${key}`) || '[]');
    switch (action) {
      case 'get_users': return [{ id: 'admin-01', username: 'admin', name: 'Demo Admin', role: 'SUPER_ADMIN', isActive: true }];
      case 'get_batches': return [{ id: 'batch-1', name: 'Demo Batch', maxSeats: 60, createdAt: Date.now() }];
      case 'get_candidates': return getStorage('candidates');
      case 'get_audit_logs': return [];
      default: return { status: 'success' };
    }
  }

  // User Management Methods
  static async getUsers(): Promise<User[]> { return this.fetchApi('get_users'); }
  static async saveUser(user: User, password?: string) { return this.fetchApi('save_user', { user, password }); }
  static async deleteUser(id: string) { return this.fetchApi('delete_user', { id }); }

  // Batch Management Methods
  static async getBatches(): Promise<Batch[]> { return this.fetchApi('get_batches'); }
  static async saveBatch(batch: Batch) { return this.fetchApi('save_batch', { batch }); }
  static async deleteBatch(id: string) { return this.fetchApi('delete_batch', { id }); }

  // Candidate Management Methods
  static async getCandidates(): Promise<Candidate[]> { return this.fetchApi('get_candidates'); }
  static async saveCandidate(candidate: Candidate) { return this.fetchApi('save_candidate', { candidate }); }

  // Audit Logs
  static async getAuditLogs(): Promise<AuditLog[]> { return this.fetchApi('get_audit_logs'); }

  static isDemoMode() { return this.useMock; }
}
