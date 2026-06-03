import { User as UserType } from '../types';
import { APP_CONFIG } from '../themeConfig';

const IS_CAPACITOR = typeof window !== 'undefined' && !!(window as any).Capacitor;
// Se estiver no navegador e sem BASE_URL definida, usa a origem atual
// Caso contrário usa o APP_CONFIG.apiUrl para Capacitor ou vazio para caminhos relativos
export const BASE_URL = IS_CAPACITOR 
  ? APP_CONFIG.apiUrl 
  : (typeof window !== 'undefined' ? window.location.origin : '');

export const getAbsoluteUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = BASE_URL || APP_CONFIG.apiUrl || 'https://app.igrejarenovar.com';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const API_URL = `${BASE_URL}/api`;

export const getApiUrl = (path: string) => `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

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
      const url = getApiUrl(path);
      if (IS_CAPACITOR) console.log(`API Request: ${url}`);
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Ocorreu um erro no servidor' }));
        const errorMessage = error.error || `Erro ${response.status}: ${response.statusText}`;
        
        let errObj: any = new Error(errorMessage);
        if (error.details) errObj.details = error.details;
        
        if (response.status === 401 || response.status === 403) {
          this.logout();
          if (typeof window !== 'undefined' && 
              window.location.pathname !== '/' && 
              !path.includes('/auth/login')) {
            window.location.href = '/';
          }
        }
        throw errObj;
      }

      return response.json();
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
         if (IS_CAPACITOR) {
             if (BASE_URL.startsWith('http://')) {
                  throw new Error('Falha de conexão (HTTP detectado). Ative "usesCleartextTraffic" no AndroidManifest ou use HTTPS.');
             }
             if (BASE_URL.includes('ais-dev')) {
                  throw new Error('Ambiente de desenvolvimento restrito. Configure um servidor de produção.');
             }
         }
         throw new Error('Sem conexão com o servidor. Verifique sua internet ou o IP do servidor.');
      }
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

  async getSysInfo() {
    return this.request('/sysinfo');
  }

  async getPublicConfig() {
    const response = await fetch(getApiUrl(`/public-config?t=${Date.now()}`));
    if (!response.ok) throw new Error('Failed to fetch public config');
    return response.json();
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

  async resetPassword(email: string): Promise<{ success: true, message: string }> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async register(userData: any): Promise<AuthResponse> {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.setToken(res.token);
    return res;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
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

  async upload(file: File) {
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
        try {
          const imageCompression = (await import('browser-image-compression')).default;
          // Compression defaults
          const options = {
            maxSizeMB: 1, 
            maxWidthOrHeight: 1920,
            useWebWorker: true
          };
          fileToUpload = await imageCompression(file, options) as File;
        } catch (e) {
          console.warn('Image compression failed, trying to upload original', e);
        }
    }

    const headers = {
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
    };

    const CHUNK_SIZE = 512 * 1024; // 512KB
    if (fileToUpload.size > CHUNK_SIZE) {
      const totalChunks = Math.ceil(fileToUpload.size / CHUNK_SIZE);
      const uploadId = Date.now().toString();

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileToUpload.size);
        const chunk = fileToUpload.slice(start, end);

        const formDataChunk = new FormData();
        formDataChunk.append('chunk', chunk, fileToUpload.name);
        formDataChunk.append('chunkIndex', i.toString());
        formDataChunk.append('totalChunks', totalChunks.toString());
        formDataChunk.append('uploadId', uploadId);
        formDataChunk.append('fileName', fileToUpload.name);

        try {
          const response = await fetch(`${API_URL}/upload-chunk`, {
            method: 'POST',
            headers,
            body: formDataChunk,
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Erro no upload do chunk' }));
            throw new Error(error.error || `Falha ao enviar chunk ${i + 1}`);
          }
          
          const result = await response.json();
          if (result.complete) {
            return result;
          }
        } catch (err) {
          if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
            throw new Error('Falha de conexão. O servidor pode estar offline ou bloqueando a requisição.');
          }
          throw err;
        }
      }
    } else {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      try {
        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Erro no upload' }));
          throw new Error(error.error || 'Falha ao enviar arquivo');
        }

        return response.json();
      } catch (err) {
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          throw new Error('Falha de conexão com o servidor de upload. O arquivo pode ser muito grande ou o servidor está offline.');
        }
        throw err;
      }
    }
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
