/**
 * TAREFA DE FUNDO — verifica notificações com o aplicativo fechado.
 *
 * Este arquivo NÃO roda na WebView. Ele é executado pelo BackgroundRunner num
 * motor JavaScript separado, sem DOM, sem window e sem localStorage. As únicas
 * coisas disponíveis são as APIs injetadas pelo plugin: CapacitorKV,
 * CapacitorNotifications, CapacitorDevice e fetch.
 *
 * Por isso o token e a URL da API chegam aqui pelo CapacitorKV — quem grava é
 * src/lib/nativeNotifications.ts, do lado da WebView.
 *
 * REALIDADE DO ANDROID: o sistema decide quando isto roda. O intervalo pedido
 * é o mínimo, não uma promessa. Em Doze mode ou com economia de bateria
 * agressiva, pode demorar muito mais ou não rodar. Isso é limitação da
 * plataforma, não deste código.
 */

const KV_TOKEN = 'notif_token';
const KV_API = 'notif_api_url';
const KV_SINCE = 'notif_since';

function readKV(key) {
  try {
    const r = CapacitorKV.get(key);
    return r && r.value ? r.value : '';
  } catch (e) {
    return '';
  }
}

/** Mesmo cálculo de id usado na WebView, para não duplicar notificação. */
function notificationId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 2147483647;
}

/**
 * Recebe token/URL/marca d'água da WebView e guarda no armazenamento nativo.
 * Disparado por nativeNotifications.ts sempre que o app checa notificações.
 */
addEventListener('syncState', (resolve, reject, args) => {
  try {
    if (args[KV_TOKEN] !== undefined) CapacitorKV.set(KV_TOKEN, String(args[KV_TOKEN]));
    if (args[KV_API] !== undefined) CapacitorKV.set(KV_API, String(args[KV_API]));
    if (args[KV_SINCE] !== undefined) CapacitorKV.set(KV_SINCE, String(args[KV_SINCE]));
    if (args.notif_fcm !== undefined) CapacitorKV.set('notif_fcm', String(args.notif_fcm));
    resolve();
  } catch (e) {
    reject(e);
  }
});

/**
 * Execução periódica agendada pelo sistema.
 * O nome 'checkNotifications' precisa bater com o `event` no capacitor.config.ts.
 */
addEventListener('checkNotifications', async (resolve, reject, args) => {
  try {
    const token = readKV(KV_TOKEN);
    const api = readKV(KV_API);

    // Sem login ou sem endereço não há o que fazer. Sai limpo para o sistema
    // não marcar a tarefa como falha e parar de agendá-la.
    if (!token || !api) {
      resolve();
      return;
    }

    // Se estiver sem rede, não gasta bateria tentando.
    try {
      const net = CapacitorDevice.getNetworkStatus();
      if (net && net.connected === false) {
        resolve();
        return;
      }
    } catch (e) {
      // Sem informação de rede, tenta assim mesmo.
    }

    const since = readKV(KV_SINCE);
    const url = api + (since ? '?since=' + encodeURIComponent(since) : '');

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token },
    });

    if (!res.ok) {
      resolve();
      return;
    }

    const data = await res.json();
    const items = data.items || [];

    // Com o Firebase ativo neste aparelho, o Android já mostrou; só avança.
    if (items.length > 0 && readKV('notif_fcm') !== '1') {
      CapacitorNotifications.schedule(
        items.map((n) => ({
          id: notificationId(n.id),
          title: n.title,
          body: n.body,
          smallIcon: 'ic_stat_igreja',
        }))
      );
    }

    if (data.serverTime) CapacitorKV.set(KV_SINCE, data.serverTime);

    resolve();
  } catch (e) {
    // Rejeitar demais faz o Android desistir de agendar a tarefa.
    // Preferimos sair em silêncio e tentar na próxima janela.
    resolve();
  }
});
