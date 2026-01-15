
import { Candidate, Batch, User, UserRole, AuditLog } from '../types';

// The leading slash ensures we always hit domain.com/admission-api
const API_URL = '/admission-api';

async function fetchApi(action: string, method: 'GET' | 'POST' = 'POST', body?: any) {
  try {
    const options: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body })
    };
    
    // Explicitly target the root API endpoint
    const response = await fetch(API_URL, options);
    
    if (!response.ok) {
        let errorMessage = `API Error ${response.status}`;
        try {
            const data = await response.json();
            errorMessage = data.message || data.error || errorMessage;
        } catch (e) {
            // If the response is HTML, it's likely a 404/500 from the web server
            if (response.status === 404) {
                errorMessage = "The API was not found. Ensure server.js is running in the Node.js Manager.";
            } else if (response.status === 503) {
                errorMessage = "System is in Setup Mode. Visit /installer.html";
            }
        }
        throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error(`StorageService.${action} failed:`, error.message);
    throw error;
  }
}

export class StorageService {
  static async init() {
    console.log("Storage service initialized. Endpoint:", API_URL);
  }

  static async getUsers(): Promise<User[]> {
    return fetchApi('get_users');
  }

  static async saveUser(user: User, password?: string) {
    return fetchApi('save_user', 'POST', { user, password });
  }

  static async deleteUser(id: string) {
    return fetchApi('delete_user', 'POST', { id });
  }

  static async getBatches(): Promise<Batch[]> {
    return fetchApi('get_batches');
  }

  static async saveBatch(batch: Batch) {
    return fetchApi('save_batch', 'POST', { batch });
  }

  static async deleteBatch(id: string) {
    return fetchApi('delete_batch', 'POST', { id });
  }

  static async getCandidates(): Promise<Candidate[]> {
    return fetchApi('get_candidates');
  }

  static async saveCandidate(candidate: Candidate) {
    return fetchApi('save_candidate', 'POST', { candidate });
  }

  static async getAuditLogs(): Promise<AuditLog[]> {
    return fetchApi('get_audit_logs');
  }

  static logAudit(log: any) {
    console.log("Local Audit Log:", log);
  }
}
