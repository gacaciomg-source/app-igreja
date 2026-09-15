/**
 * NOTIFICAÇÕES PELO FIREBASE NO APP ANDROID
 *
 * Pronto, mas DESLIGADO até a próxima versão do APK. Para ligar:
 *   1. baixar o google-services.json do projeto no Firebase e colocar em
 *      android/app/google-services.json;
 *   2. trocar FIREBASE_NO_APP para true, logo abaixo;
 *   3. `npm run build && npx cap sync android` e gerar o AAB.
 *
 * Sem o google-services.json, pedir o registro ao Firebase FECHA o app no
 * Android. Por isso a chave abaixo — não ligue sem o arquivo.
 *
 * Como convive com o sistema antigo (src/lib/nativeNotifications.ts):
 *  - com o app fechado, quem mostra a notificação é o próprio Android (FCM);
 *  - com o app aberto, o Firebase entrega aqui e mostramos como notificação local;
 *  - a busca periódica no servidor continua, como reserva. Cada notificação tem
 *    um id; ids já mostrados pelo Firebase são pulados pela busca, então nada
 *    aparece duas vezes.
 */
import { IS_NATIVE } from './native';
import { api } from '../services/apiService';

export const FIREBASE_NO_APP = false;

const KEY_TOKEN = 'fcm_token';
const KEY_VISTOS = 'fcm_ids_vistos';
const MAX_VISTOS = 200;

let ativo = false;

/** Ids de notificação que já chegaram pelo Firebase neste aparelho. */
export function jaRecebidoPeloFirebase(id: string): boolean {
  try { return (JSON.parse(localStorage.getItem(KEY_VISTOS) || '[]') as string[]).includes(id); }
  catch { return false; }
}

/** Marca o id como já mostrado, venha do Firebase ou da busca no servidor. */
export function marcarVisto(id?: string) {
  if (!id) return;
  try {
    const vistos = (JSON.parse(localStorage.getItem(KEY_VISTOS) || '[]') as string[]).filter(v => v !== id);
    vistos.push(id);
    localStorage.setItem(KEY_VISTOS, JSON.stringify(vistos.slice(-MAX_VISTOS)));
  } catch { /* sem armazenamento, no máximo repete uma notificação */ }
}

/** O Firebase está entregando neste aparelho (há código registrado). */
export function firebaseAtivo(): boolean {
  return FIREBASE_NO_APP && ativo;
}

/**
 * Registra o aparelho no Firebase e no servidor da igreja. Chamar depois do
 * login. Nunca lança: se algo falhar, o caminho antigo continua valendo.
 */
export async function iniciarFirebase(): Promise<void> {
  if (!IS_NATIVE || !FIREBASE_NO_APP || !localStorage.getItem('auth_token')) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return;

    // Canal com o mesmo id usado pelo servidor (android.notification.channelId).
    await PushNotifications.createChannel({
      id: 'avisos', name: 'Avisos da igreja', importance: 4, visibility: 1,
    }).catch(() => undefined);

    await PushNotifications.removeAllListeners();

    PushNotifications.addListener('registration', async ({ value }) => {
      localStorage.setItem(KEY_TOKEN, value);
      try {
        await api.request('/push/fcm-token', { method: 'POST', body: JSON.stringify({ token: value, platform: 'android' }) });
        ativo = true;
      } catch (e) {
        console.warn('[FCM] Servidor não registrou o aparelho:', e);
      }
    });

    PushNotifications.addListener('registrationError', (e) => console.warn('[FCM] Falha no registro:', e));

    // App aberto: o Android não mostra sozinho, então mostramos como local.
    PushNotifications.addListener('pushNotificationReceived', async (n) => {
      const id = (n.data as any)?.id as string | undefined;
      if (id && jaRecebidoPeloFirebase(id)) return;
      marcarVisto(id);
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { notificationId } = await import('./nativeNotifications');
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId(id || String(Date.now())),
          title: n.title || 'Nova notificação',
          body: n.body || '',
          smallIcon: 'ic_stat_igreja',
          extra: { url: (n.data as any)?.url || '/' },
        }],
      }).catch(() => undefined);
    });

    // Toque na notificação que chegou com o app fechado.
    PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const data = notification.data as any;
      marcarVisto(data?.id);
      if (typeof data?.url === 'string' && data.url.startsWith('/')) window.location.hash = data.url;
    });

    await PushNotifications.register();
  } catch (e) {
    console.warn('[FCM] Firebase indisponível, seguindo pelo caminho antigo:', e);
  }
}

/** No logout: o aparelho para de receber as notificações de quem saiu. */
export async function encerrarFirebase(): Promise<void> {
  const token = localStorage.getItem(KEY_TOKEN);
  ativo = false;
  if (!token) return;
  await api.request('/push/fcm-token', { method: 'DELETE', body: JSON.stringify({ token }) }).catch(() => undefined);
  localStorage.removeItem(KEY_TOKEN);
}
