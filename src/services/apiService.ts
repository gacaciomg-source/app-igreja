import { User as UserType } from '../types';

const API_URL = '/api';

interface AuthResponse {
  user: UserType;
  token: string;
}

class ApiService {
  private token: string | null = localStorage.getItem('auth_token');

  async request(path: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...((options.headers as any) || {}),
    };

    try {
      const response = await fetch(`${API_URL}${path}`, { ...options, headers });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Ocorreu um erro no servidor' }));
        const errorMessage = error.error || `Erro ${response.status}: ${response.statusText}`;
        
        if (response.status === 401 || response.status === 403) {
          this.logout();
          // Force reload to clear app state if not handled by components
          // But only if we're not already at root and not in a login attempt
          if (typeof window !== 'undefined' && 
              window.location.pathname !== '/' && 
              !path.includes('/auth/login')) {
            window.location.href = '/';
          }
        }
        
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error('Falha na comunicação com o servidor');
    }
  }

  async sendWhatsApp(to: string, message: string) {
    return this.request('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ to, message }),
    });
  }

  async getWhatsAppStatus() {
    return this.request('/whatsapp/status');
  }

  async reconnectWhatsApp() {
    return this.request('/whatsapp/reconnect', { method: 'POST' });
  }

  async logoutWhatsApp() {
    return this.request('/whatsapp/logout', { method: 'POST' });
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  // --- Auth ---
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async register(userData: any): Promise<AuthResponse> {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.setToken(res.token);
    return res;
  }

  logout() {
    this.setToken(null);
  }

  // --- Collections ---
  async list(collection: string) {
    return this.request(`/collections/${collection}`);
  }

  async get(collection: string, id: string) {
    return this.request(`/collections/${collection}/${id}`);
  }

  async create(collection: string, data: any) {
    return this.request(`/collections/${collection}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update(collection: string, id: string, data: any) {
    return this.request(`/collections/${collection}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(collection: string, id: string) {
    return this.request(`/collections/${collection}/${id}`, {
      method: 'DELETE',
    });
  }

  async confirmMinistrySchedule(scheduleId: string, status: 'confirmed' | 'declined') {
    return this.request('/ministries/confirm', {
      method: 'POST',
      body: JSON.stringify({ scheduleId, status }),
    });
  }

  // Simple polling helper for onSnapshot replacement
  subscribe(collection: string, callback: (data: any[]) => void, interval = 5000) {
    const poll = async () => {
      try {
        const data = await this.list(collection);
        callback(data);
      } catch (err) {
        console.error(`Error polling ${collection}:`, err);
      }
    };
    poll();
    const timer = setInterval(poll, interval);
    return () => clearInterval(timer);
  }
}

export const api = new ApiService();
