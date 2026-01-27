
import { Candidate, Batch, User, UserRole, AuditLog } from '../types';

// Using a leading slash ensures requests always go to domain.com/admission-api
const API_URL = '/admission-api';

const isLocalPreview = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('stackblitz') || 
                       window.location.hostname.includes('webcontainer') ||
                       window.location.hostname.includes('gemini');

export class StorageService {
  private static useMock = isLocalPreview;

  static async init() {
    console.log(`Storage service initialized. Mode: ${this.useMock ? 'Mock' : 'API'}`);
    if (!this.useMock) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        // Explicitly check the health endpoint at the root
        const res = await fetch(`${API_URL}/status`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error();
      } catch (e) {
        console.warn("Production Backend unreachable at /admission-api/status. Switching to Demo Mode for safety.");
        this.useMock = true;
      }
    }
  }

  private static async fetchApi(action: string, body?: any) {
    if (this.useMock) return this.mockAction(action, body);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body })
      });
      
      if (!response.ok) {
          if (response.status === 404) {
              throw new Error("API endpoint not found (404). Check if Node.js server.js is running.");
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error(`API Request [${action}] failed:`, error.message);
      throw error;
    }
  }

  private static mockAction(action: string, body?: any): any {
    const getStorage = (key: string) => JSON.parse(localStorage.getItem(`crm_mock_${key}`) || '[]');
    const setStorage = (key: string, val: any) => localStorage.setItem(`crm_mock_${key}`, JSON.stringify(val));

    switch (action) {
      case 'get_users': return getStorage('users').length ? getStorage('users') : [{ id: 'admin-01', username: 'admin', name: 'Demo Admin', role: 'SUPER_ADMIN', isActive: true }];
      case 'save_user':
        const users = getStorage('users');
        const idx = users.findIndex((u: any) => u.id === body.user.id);
        if (idx >= 0) users[idx] = body.user; else users.push(body.user);
        setStorage('users', users);
        return { status: 'success' };
      case 'get_batches': return getStorage('batches').length ? getStorage('batches') : [{ id: 'batch-1', name: 'July 2026', maxSeats: 60, createdAt: Date.now() }];
      case 'save_batch':
        const batches = getStorage('batches');
        const bIdx = batches.findIndex((b: any) => b.id === body.batch.id);
        if (bIdx >= 0) batches[bIdx] = body.batch; else batches.push(body.batch);
        setStorage('batches', batches);
        return { status: 'success' };
      case 'get_candidates': return getStorage('candidates');
      case 'save_candidate':
        const candidates = getStorage('candidates');
        const cIdx = candidates.findIndex((c: any) => c.id === body.candidate.id);
        if (cIdx >= 0) candidates[cIdx] = body.candidate; else candidates.push(body.candidate);
        setStorage('candidates', candidates);
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
  static async getAuditLogs(): Promise<AuditLog[]> { return this.fetchApi('get_audit_logs'); }
  static isDemoMode() { return this.useMock; }
}
