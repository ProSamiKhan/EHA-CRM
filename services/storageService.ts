
import { Candidate, Batch, User, AuditLog } from '../types';

const API_URL = '/api-v1';

export class StorageService {
  private static initialized = false;

  static async init() {
    if (this.initialized) return;
    
    if (typeof window === 'undefined') return;

    try {
      const res = await fetch('/api-status', { cache: 'no-store' });
      if (!res.ok) {
        console.warn("Backend API status check failed. Ensure server is running.");
      }
    } catch (error) {
      console.error("Backend not reachable. System requires an active API connection.");
    }
    
    this.initialized = true;
  }

  private static async fetchApi(action: string, body?: any) {
    if (!this.initialized) await this.init();
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error(`API call failed for ${action}:`, error);
      throw error;
    }
  }

  static async getUsers(): Promise<User[]> { 
    return this.fetchApi('get_users'); 
  }

  static async saveUser(user: User, password?: string) { 
    return this.fetchApi('save_user', { user, password }); 
  }

  static async deleteUser(id: string) { 
    return this.fetchApi('delete_user', { id }); 
  }

  static async getBatches(): Promise<Batch[]> { 
    return this.fetchApi('get_batches'); 
  }

  static async saveBatch(batch: Batch) { 
    return this.fetchApi('save_batch', { batch }); 
  }

  static async deleteBatch(id: string) { 
    return this.fetchApi('delete_batch', { id }); 
  }

  static async getCandidates(): Promise<Candidate[]> { 
    const result = await this.fetchApi('get_candidates');
    return Array.isArray(result) ? result : [];
  }

  static async saveCandidate(candidate: Candidate) { 
    return this.fetchApi('save_candidate', { candidate }); 
  }

  static async getAuditLogs(): Promise<AuditLog[]> { 
    const result = await this.fetchApi('get_audit_logs');
    return Array.isArray(result) ? result : [];
  }

  // Helper to check if API is alive
  static async isSystemReady(): Promise<boolean> {
    try {
      const res = await fetch('/api-status');
      return res.ok;
    } catch {
      return false;
    }
  }
}
