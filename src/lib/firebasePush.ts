/**
 * NOTIFICAÇÕES PELO FIREBASE (FCM) — lado do servidor
 *
 * Funciona JUNTO com o sistema atual, não no lugar dele:
 *  - o navegador/PWA continua recebendo por Web Push (VAPID);
 *  - o app Android antigo continua buscando em GET /api/notifications;
 *  - o app Android com Firebase recebe por aqui, na hora, com o app fechado.
 *
 * A chave do Firebase (conta de serviço) é enviada pelo painel, tela Servidor,
 * e fica em data/firebase-service-account.json — data/ nunca vai para o Git.
 * Sem chave cadastrada, tudo aqui simplesmente não faz nada.
 *
 * Cada notificação leva o mesmo `id` gravado em /api/notifications. O app usa
 * esse id para nunca mostrar a mesma notificação duas vezes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, deleteApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const ARQUIVO_CHAVE = () => path.join(process.cwd(), 'data', 'firebase-service-account.json');

export interface ChaveFirebase {
  type: string;
  project_id: string;
  client_email: string;
  private_key: string;
  [k: string]: unknown;
}

let app: App | null = null;

/** Confere se o JSON enviado é mesmo uma chave de conta de serviço do Firebase. */
export function validarChave(dados: any): string | null {
  if (!dados || typeof dados !== 'object') return 'O arquivo não é um JSON válido.';
  if (dados.type !== 'service_account') {
    return 'Este não é o arquivo certo. Use a chave de "Contas de serviço" (Configurações do projeto → Contas de serviço → Gerar nova chave privada), não o google-services.json.';
  }
  for (const campo of ['project_id', 'client_email', 'private_key']) {
    if (typeof dados[campo] !== 'string' || !dados[campo]) return `O arquivo está incompleto (falta "${campo}").`;
  }
  return null;
}

function lerChave(): ChaveFirebase | null {
  try {
    const dados = JSON.parse(fs.readFileSync(ARQUIVO_CHAVE(), 'utf8'));
    return validarChave(dados) ? null : dados;
  } catch {
    return null;
  }
}

function obterApp(): App | null {
  if (app) return app;
  const chave = lerChave();
  if (!chave) return null;
  try {
    app = initializeApp({ credential: cert(chave as any), projectId: chave.project_id }, 'igreja-fcm');
  } catch (e) {
    console.error('[FCM] Chave do Firebase recusada:', (e as Error).message);
    app = null;
  }
  return app;
}

async function reiniciar() {
  if (app) await deleteApp(app).catch(() => undefined);
  app = null;
}

export async function salvarChave(dados: ChaveFirebase) {
  await fs.promises.mkdir(path.dirname(ARQUIVO_CHAVE()), { recursive: true });
  await fs.promises.writeFile(ARQUIVO_CHAVE(), JSON.stringify(dados, null, 2), { mode: 0o600 });
  await reiniciar();
  if (!obterApp()) throw new Error('O Firebase recusou esta chave. Gere uma chave nova no console do Firebase e envie de novo.');
}

export async function removerChave() {
  await fs.promises.rm(ARQUIVO_CHAVE(), { force: true });
  await reiniciar();
}

/** O que o painel mostra. Nunca devolve a chave privada. */
export function statusFirebase() {
  const chave = lerChave();
  return chave
    ? { configurado: true, projeto: chave.project_id, conta: chave.client_email }
    : { configurado: false };
}

export interface MensagemPush { id: string; title: string; body: string; url: string }

/**
 * Envia para os aparelhos. Devolve os tokens que o Firebase disse não existirem
 * mais (app desinstalado, dados apagados) — quem chama apaga esses registros.
 */
export async function enviarFcm(tokens: string[], msg: MensagemPush): Promise<{ enviados: number; invalidos: string[] }> {
  const a = tokens.length ? obterApp() : null;
  if (!a) return { enviados: 0, invalidos: [] };

  const invalidos: string[] = [];
  let enviados = 0;
  // O FCM aceita no máximo 500 aparelhos por envio.
  for (let i = 0; i < tokens.length; i += 500) {
    const lote = tokens.slice(i, i + 500);
    const r = await getMessaging(a).sendEachForMulticast({
      tokens: lote,
      notification: { title: msg.title, body: msg.body },
      data: { id: msg.id, url: msg.url || '/' },
      android: {
        priority: 'high',
        // Mesma tag = o Android substitui em vez de empilhar a mesma notificação.
        notification: { tag: msg.id, icon: 'ic_stat_igreja', color: '#0f2616', channelId: 'avisos' },
      },
    });
    enviados += r.successCount;
    r.responses.forEach((resp, j) => {
      const codigo = resp.error?.code || '';
      if (codigo === 'messaging/registration-token-not-registered' || codigo === 'messaging/invalid-registration-token') {
        invalidos.push(lote[j]);
      } else if (resp.error) {
        console.error('[FCM] Falha ao enviar:', codigo, resp.error.message);
      }
    });
  }
  return { enviados, invalidos };
}
