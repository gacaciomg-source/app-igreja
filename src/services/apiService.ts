import { User as UserType } from '../types';

const API_URL = '/api';

interface AuthResponse {
  user: UserType;
  token: string;
}

class ApiService {
  private token: string | null = localStorage.getItem('auth_token');

  private async request(path: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...((options.headers as any) || {}),
    };

    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(error.error || 'Erro na requisição');
    }

    return response.json();
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
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
