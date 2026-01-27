
import { Candidate, Batch, User, UserRole, AuditLog } from '../types';

// The absolute path to the API endpoint on the domain
const API_URL = '/admission-api';

export class StorageService {
  private static useMock = false;
  private static initialized = false;

  static async init() {
    if (this.initialized) return;
    
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname.includes('stackblitz') || 
                    window.location.hostname.includes('webcontainer') ||
                    window.location.hostname.includes('gemini') ||
                    window.location.hostname.includes('preview');

    console.log(`[STORAGE] Initialization starting...`);
    console.log(`[STORAGE] Environment: ${isLocal ? 'DEVELOPMENT' : 'PRODUCTION'}`);
    console.log(`[STORAGE] Target API Path: ${API_URL}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch(`${API_URL}/status`, { 
        method: 'GET',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        console.log("[STORAGE] Backend connection verified:", data);
        this.useMock = false;
      } else {
        console.warn(`[STORAGE] Backend returned non-OK status: ${res.status}`);
        throw new Error(`Status ${res.status}`);
      }
    } catch (e: any) {
      console.warn(`[STORAGE] Connectivity probe failed: ${e.message}`);
      
      // Fallback behavior
      if (isLocal) {
          console.info("[STORAGE] Local dev detected. Enabling Mock Storage.");
          this.useMock = true;
      } else {
          console.error("[STORAGE] CRITICAL: Production backend unreachable at /admission-api/status.");
          // We enable mock so the user doesn't see a white screen, but real data won't work.
          this.useMock = true;
      }
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
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API responded with error ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error(`[STORAGE] API Call '${action}' Failed:`, error.message);
      // If we are in production and it fails, don't automatically switch to mock mid-session
      // to avoid data loss/confusion, just propagate the error.
      throw error;
    }
  }

  private static mockAction(action: string, body?: any): any {
    const getStorage = (key: string) => JSON.parse(localStorage.getItem(`crm_mock_${key}`) || '[]');
    const setStorage = (key: string, val: any) => localStorage.setItem(`crm_mock_${key}`, JSON.stringify(val));

    switch (action) {
      case 'get_users': 
        const u = getStorage('users');
        return u.length ? u : [{ id: 'admin-01', username: 'admin', name: 'Demo Admin', role: 'SUPER_ADMIN', isActive: true }];
      case 'save_user':
        const users = getStorage('users');
        const idx = users.findIndex((u: any) => u.id === body.user.id);
        if (idx >= 0) users[idx] = body.user; else users.push(body.user);
        setStorage('users', users);
        return { status: 'success' };
      case 'get_batches': 
        const b = getStorage('batches');
        return b.length ? b : [{ id: 'batch-1', name: 'July 2026 Intake', maxSeats: 60, createdAt: Date.now() }];
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
      case 'delete_user':
        setStorage('users', getStorage('users').filter((u: any) => u.id !== body.id));
        return { status: 'success' };
      case 'delete_batch':
        setStorage('batches', getStorage('batches').filter((b: any) => b.id !== body.id));
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
