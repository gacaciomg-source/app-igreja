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

/**
 * Piso do intervalo de atualização automática, em milissegundos.
 *
 * Para um aplicativo de igreja, 20 segundos é imperceptível na prática (um
 * pedido de oração novo aparece em até 20s) e reduz a carga em cerca de 4x
 * em relação aos 5 segundos usados antes.
 */
const MIN_POLL_INTERVAL = 20000;

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
        
        if (response.status === 401) {
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
         let message = 'Sem conexão com o servidor. Verifique sua internet ou o IP do servidor.';
         if (IS_CAPACITOR) {
             if (BASE_URL.startsWith('http://')) {
                  message = 'Falha de conexão (HTTP detectado). Ative "usesCleartextTraffic" no AndroidManifest ou use HTTPS.';
             } else if (BASE_URL.includes('ais-dev')) {
                  message = 'Ambiente de desenvolvimento restrito. Configure um servidor de produção.';
             }
         }
         // Marcado para que `list()` saiba que pode usar o cache local
         const netErr: any = new Error(message);
         netErr.isNetworkError = true;
         throw netErr;
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

  /**
   * Exclui definitivamente a conta do usuário logado.
   * Exigência da Política de Exclusão de Dados da Google Play.
   */
  async deleteAccount(password: string) {
    const res = await this.request('/auth/delete-account', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    this.logout();
    return res;
  }

  logout() {
    this.setToken(null);
    // Dados de membros em cache não devem sobreviver ao logout
    this.clearCache();
  }

  // --- Cache offline ---
  //
  // Guarda a última resposta bem-sucedida de cada coleção. Quando o celular
  // está sem internet, `list()` devolve esses dados em vez de falhar, e a
  // interface continua utilizável (só desatualizada).

  private cacheKey(collection: string) {
    return `cache_col_${collection}`;
  }

  private writeCache(collection: string, data: any[]) {
    try {
      localStorage.setItem(
        this.cacheKey(collection),
        JSON.stringify({ at: Date.now(), data })
      );
    } catch {
      // Cota do localStorage estourada — seguimos sem cache desta coleção
    }
  }

  private readCache(collection: string): { at: number; data: any[] } | null {
    try {
      const raw = localStorage.getItem(this.cacheKey(collection));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.data)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /** Quando a coleção foi sincronizada por último (null se nunca).
   *  Serve para exibir "dados de X atrás" quando estiver offline. */
  getLastSync(collection: string): Date | null {
    const cached = this.readCache(collection);
    return cached ? new Date(cached.at) : null;
  }

  /** true se a última chamada a `list()` foi servida pelo cache local. */
  isServingCache(collection: string): boolean {
    return this.staleCollections.has(collection);
  }

  private staleCollections = new Set<string>();

  /** Limpa o cache offline. Chamado no logout. */
  clearCache() {
    this.staleCollections.clear();
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('cache_col_'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  }

  // --- Collections ---
  async list(collection: string) {
    try {
      const data = await this.request(`/collections/${collection}`);
      if (Array.isArray(data)) {
        this.writeCache(collection, data);
        this.staleCollections.delete(collection);
      }
      return data;
    } catch (err: any) {
      // Só usamos o cache em falha de rede. Erro de permissão ou sessão
      // expirada precisa continuar falhando de verdade.
      if (err?.isNetworkError) {
        const cached = this.readCache(collection);
        if (cached) {
          this.staleCollections.add(collection);
          console.warn(
            `[Offline] Usando cache de "${collection}" de ${new Date(cached.at).toLocaleString('pt-BR')}`
          );
          return cached.data;
        }
      }
      throw err;
    }
  }

  async get(collection: string, id: string) {
    return this.request(`/collections/${collection}/${id}`);
  }

  async createPublicPrayer(data: any) {
    return this.request('/public/prayers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  /**
   * Substituto do onSnapshot do Firestore: busca a coleção periodicamente.
   *
   * As telas pediam 5 segundos. Com 15 assinaturas ativas ao mesmo tempo, isso
   * dava 3 requisições por segundo POR USUÁRIO, para sempre, com o app aberto —
   * e cada uma relia o arquivo JSON inteiro no servidor. Três cuidados aqui:
   *
   * 1. INTERVALO MÍNIMO — o valor pedido pela tela é tratado como sugestão e
   *    respeita um piso (MIN_POLL_INTERVAL).
   * 2. PAUSA EM SEGUNDO PLANO — sem isso o app segue consumindo bateria e
   *    dados no bolso do usuário. Ao voltar para a tela, busca na hora.
   * 3. ESPALHAMENTO — um atraso aleatório evita que todas as assinaturas
   *    disparem no mesmo instante e criem picos no servidor.
   */
  subscribe(collection: string, callback: (data: any[]) => void, interval = MIN_POLL_INTERVAL) {
    const period = Math.max(interval, MIN_POLL_INTERVAL) + Math.floor(Math.random() * 4000);
    let stopped = false;
    let inFlight = false;

    const poll = async () => {
      if (stopped || inFlight) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      inFlight = true;
      try {
        const data = await this.list(collection);
        if (!stopped) callback(data);
      } catch (err) {
        console.error(`Error polling ${collection}:`, err);
      } finally {
        inFlight = false;
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden) poll();
    };

    poll();
    const timer = setInterval(poll, period);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      stopped = true;
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }
}

export const api = new ApiService();
