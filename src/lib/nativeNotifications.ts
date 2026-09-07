/**
 * NOTIFICAÇÕES NO APLICATIVO ANDROID (sem Firebase)
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * O app web recebe notificação por Web Push (VAPID), tratado no service worker
 * em public/sw.js. Isso NÃO funciona dentro do aplicativo nativo: a WebView do
 * Android não implementa a PushManager, então `registerPushNotifications()`
 * em App.tsx sai logo na primeira linha quando roda no APK.
 *
 * A solução aqui não depende de Firebase nem de nenhum serviço externo: o app
 * consulta o próprio servidor da igreja de tempos em tempos (GET
 * /api/notifications) e transforma o que vier em notificação local.
 *
 * LIMITAÇÃO QUE VOCÊ PRECISA CONHECER
 * Com o app aberto, a checagem é de minuto em minuto. Com o app fechado, quem
 * executa é o BackgroundRunner (public/background-runner.js), e aí valem as
 * regras do Android: o intervalo mínimo real é ~15 minutos e o sistema pode
 * atrasar ou pular execuções para poupar bateria. Em aparelhos com economia
 * agressiva (Xiaomi, Samsung, Oppo) pode não rodar enquanto fechado.
 * Notificação instantânea com app fechado só existe pelo socket do Google.
 */
import { LocalNotifications } from '@capacitor/local-notifications';
import { IS_NATIVE } from './native';
import { getApiUrl } from '../services/apiService';

/** Marca d'água do último item já notificado. Guardamos o `serverTime` que o
 *  servidor devolve, não o relógio do celular — celular com hora errada faria
 *  o app pular ou repetir notificações. */
const SINCE_KEY = 'notif_last_seen';

/** Chaves espelhadas no armazenamento nativo para o background-runner ler.
 *  O runner roda fora da WebView e não enxerga o localStorage. */
const KV_TOKEN = 'notif_token';
const KV_API = 'notif_api_url';
const KV_SINCE = 'notif_since';

/** De minuto em minuto enquanto o app está na frente do usuário. */
const FOREGROUND_POLL_MS = 60_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let running = false;

/** O Android exige id inteiro de 32 bits. Derivamos do id textual para que a
 *  mesma notificação nunca apareça duas vezes. */
function notificationId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 2147483647;
}

/**
 * Pede a permissão de notificação.
 * No Android 13+ (POST_NOTIFICATIONS) sem isso nada aparece, silenciosamente.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!IS_NATIVE) return false;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    if (current.display === 'denied') return false;
    const asked = await LocalNotifications.requestPermissions();
    return asked.display === 'granted';
  } catch (e) {
    console.warn('[Notif] Não foi possível verificar a permissão:', e);
    return false;
  }
}

/** Copia token, URL da API e marca d'água para o armazenamento nativo, de onde
 *  o background-runner consegue ler com o app fechado. */
async function syncStateForBackgroundRunner() {
  try {
    const { BackgroundRunner } = await import('@capacitor/background-runner');
    await BackgroundRunner.dispatchEvent({
      label: 'com.renovar.notifications',
      event: 'syncState',
      details: {
        [KV_TOKEN]: localStorage.getItem('auth_token') || '',
        [KV_API]: getApiUrl('/notifications'),
        [KV_SINCE]: localStorage.getItem(SINCE_KEY) || '',
      },
    });
  } catch (e) {
    // O runner é um extra: se não estiver disponível, o app segue funcionando
    // normalmente enquanto estiver aberto.
    console.warn('[Notif] BackgroundRunner indisponível:', e);
  }
}

/**
 * Busca as notificações novas e mostra cada uma.
 * Devolve quantas foram exibidas. Nunca lança.
 */
export async function checkNotifications(): Promise<number> {
  if (!IS_NATIVE) return 0;

  const token = localStorage.getItem('auth_token');
  if (!token) return 0; // ninguém logado, nada a fazer

  try {
    const since = localStorage.getItem(SINCE_KEY);
    const url = getApiUrl('/notifications') + (since ? `?since=${encodeURIComponent(since)}` : '');

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      // 401 = sessão expirada. Não insistir nem apagar a marca d'água.
      if (res.status !== 401) console.warn('[Notif] Servidor respondeu', res.status);
      return 0;
    }

    const data = await res.json();
    const items: Array<{ id: string; title: string; body: string; url: string }> = data.items || [];

    if (items.length > 0) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        // Sem permissão não adianta agendar, mas avançamos a marca d'água
        // assim mesmo para não acumular um lote gigante para depois.
        if (data.serverTime) localStorage.setItem(SINCE_KEY, data.serverTime);
        return 0;
      }

      await LocalNotifications.schedule({
        notifications: items.map((n) => ({
          id: notificationId(n.id),
          title: n.title,
          body: n.body,
          smallIcon: 'ic_stat_igreja',
          extra: { url: n.url || '/' },
        })),
      });
    }

    // Só avança depois de agendar com sucesso: se a rede cair no meio, a
    // próxima rodada tenta de novo em vez de perder a notificação.
    if (data.serverTime) localStorage.setItem(SINCE_KEY, data.serverTime);

    await syncStateForBackgroundRunner();
    return items.length;
  } catch (e) {
    console.warn('[Notif] Falha ao consultar notificações:', e);
    return 0;
  }
}

/** Leva o usuário para a tela certa quando ele toca na notificação. */
function registerTapHandler() {
  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const url = (action.notification.extra as any)?.url;
    if (url && typeof url === 'string' && url.startsWith('/')) {
      window.location.hash = url;
    }
  }).catch((e) => console.warn('[Notif] Não foi possível ouvir o toque:', e));
}

/**
 * Liga a verificação periódica. Idempotente: chamar duas vezes não cria
 * dois timers.
 */
export function startNotificationPolling() {
  if (!IS_NATIVE || running) return;
  running = true;

  registerTapHandler();

  // Uma checagem imediata, para o caso de ter chegado algo com o app fechado.
  void checkNotifications();

  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') void checkNotifications();
  }, FOREGROUND_POLL_MS);

  // Voltar para o app é o melhor momento para checar: é quando o usuário
  // está olhando e quando o Android provavelmente bloqueou o trabalho de fundo.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkNotifications();
  });
}

/** Desliga a verificação (usado no logout). */
export function stopNotificationPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  running = false;
}

/** Limpa a marca d'água. Chamar no logout para o próximo usuário não herdar
 *  o histórico de quem estava logado antes. */
export function resetNotificationState() {
  localStorage.removeItem(SINCE_KEY);
}
