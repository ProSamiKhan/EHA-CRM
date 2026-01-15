
import { Candidate, Batch, User, UserRole, AuditLog } from '../types';

// Using absolute path for clarity in production routing
const API_URL = '/admission-api';

async function fetchApi(action: string, method: 'GET' | 'POST' = 'POST', body?: any) {
  try {
    const options: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body })
    };
    
    const response = await fetch(API_URL, options);
    
    if (!response.ok) {
        // Try to get JSON error first
        const text = await response.text();
        let errorMessage = `Server error: ${response.status}`;
        try {
            const json = JSON.parse(text);
            errorMessage = json.error || json.message || errorMessage;
        } catch (e) {
            // If not JSON, it might be a LiteSpeed/Apache 404 page
            if (text.includes('Page Not Found') || text.includes('Does Not Exist')) {
                errorMessage = "LiteSpeed 404: The server failed to route this request to the Node.js app. Check .htaccess or app startup file.";
            } else {
                errorMessage = text.substring(0, 100);
            }
        }
        throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    throw error;
  }
}

export class StorageService {
  static async init() {
    console.log("Storage service initialized. Target:", API_URL);
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
    console.log("Audit log tracked locally", log);
  }
}
