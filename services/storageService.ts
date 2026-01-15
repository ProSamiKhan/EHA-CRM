
import { Candidate, Batch, User, UserRole, AuditLog } from '../types';

// Ensure this path starts with / to always hit the domain root
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
        const text = await response.text();
        let errorMessage = `Server Error: ${response.status}`;
        try {
            const json = JSON.parse(text);
            errorMessage = json.error || json.message || errorMessage;
        } catch (e) {
            if (text.includes('Page Not Found') || text.includes('Does Not Exist')) {
                errorMessage = "The API endpoint /admission-api returned 404. Ensure server.js is running and .htaccess is correct.";
            }
        }
        throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error(`API Error (${action}):`, error.message);
    throw error;
  }
}

export class StorageService {
  static async init() {
    console.log("Storage service initialized. API Endpoint:", API_URL);
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
