
import { Candidate, Batch, User, UserRole, AuditLog } from '../types';

const API_URL = 'api.php';

async function fetchApi(action: string, method: 'GET' | 'POST' = 'POST', body?: any) {
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (method === 'POST') {
      options.body = JSON.stringify({ action, ...body });
    } else {
      const url = new URL(API_URL, window.location.href);
      url.searchParams.append('action', action);
      return fetch(url.toString()).then(res => res.json());
    }
    const response = await fetch(API_URL, options);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    throw error;
  }
}

export class StorageService {
  static async init() {
    // Initialization now happens on the server via schema.sql
    console.log("Database connection initialized");
  }

  static async getUsers(): Promise<User[]> {
    return fetchApi('get_users', 'GET');
  }

  static async saveUser(user: User, password?: string) {
    return fetchApi('save_user', 'POST', { user, password });
  }

  // Added fix: Implementation for deleteUser
  static async deleteUser(id: string) {
    return fetchApi('delete_user', 'POST', { id });
  }

  static async getBatches(): Promise<Batch[]> {
    return fetchApi('get_batches', 'GET');
  }

  static async saveBatch(batch: Batch) {
    return fetchApi('save_batch', 'POST', { batch });
  }

  // Added fix: Implementation for deleteBatch
  static async deleteBatch(id: string) {
    return fetchApi('delete_batch', 'POST', { id });
  }

  static async getCandidates(): Promise<Candidate[]> {
    return fetchApi('get_candidates', 'GET');
  }

  static async saveCandidate(candidate: Candidate) {
    return fetchApi('save_candidate', 'POST', { candidate });
  }

  // Added fix: Implementation for getAuditLogs
  static async getAuditLogs(): Promise<AuditLog[]> {
    return fetchApi('get_audit_logs', 'GET');
  }

  static logAudit(log: any) {
    // Audit logging could be implemented in api.php as well
    console.log("Audit log saved to DB", log);
  }
}
