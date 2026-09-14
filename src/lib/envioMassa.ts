/**
 * ENVIO EM MASSA PELO WHATSAPP — fila do servidor
 *
 * Um envio escolhe categorias de membros (visitantes, novos membros...),
 * uma mensagem com {nome}/{primeiro_nome} e, se quiser, uma imagem.
 *
 * As mensagens saem UMA POR VEZ, com intervalo aleatório entre elas. Disparar
 * tudo de uma vez é o jeito mais rápido de o WhatsApp bloquear o número da
 * igreja — principalmente para quem não tem o número salvo.
 *
 * O progresso fica na coleção "envios_massa": dá para fechar o painel e
 * voltar depois. Se o servidor reiniciar no meio, o envio continua de onde
 * parou (quem já recebeu não recebe de novo).
 *
 * Quem respondeu que não quer mais receber (consolidationOptOut) é pulado.
 */
import * as storage from './storage';

export const CATEGORIAS: Record<string, string> = {
  visitor: 'Visitantes',
  new_member: 'Novos membros',
  integrated: 'Integrados',
  active: 'Membros ativos',
  sem_categoria: 'Sem categoria',
};

export interface Destinatario { userId: string; nome: string; telefone: string; situacao: 'pendente' | 'enviado' | 'falhou' | 'pulado'; erro?: string }

export interface EnvioMassa {
  id: string;
  mensagem: string;
  imagemUrl?: string;
  categorias: string[];
  criadoPor: string;
  criadoEm: string;
  agendadoPara?: string;          // ISO; sem isso, começa na hora
  status: 'agendado' | 'enviando' | 'concluido' | 'cancelado';
  destinatarios: Destinatario[];
  concluidoEm?: string;
}

export type FuncaoEnvio = (telefone: string, texto: string, imagemUrl?: string) => Promise<void>;

const INTERVALO_MIN_MS = 8_000;
const INTERVALO_MAX_MS = 20_000;
const COLECAO = 'envios_massa';

export const categoriaDe = (u: any) => (u?.memberStatus && CATEGORIAS[u.memberStatus] ? u.memberStatus : 'sem_categoria');

export function personalizar(texto: string, nome: string) {
  const primeiro = (nome || '').trim().split(/\s+/)[0] || '';
  return texto.replace(/\{nome\}/gi, nome || '').replace(/\{primeiro_nome\}/gi, primeiro);
}

/** Quem vai receber: tem telefone, está numa das categorias e não pediu para sair. */
export function escolherDestinatarios(usuarios: any[], categorias: string[]): { lista: Destinatario[]; semTelefone: number; naoQuerem: number } {
  let semTelefone = 0, naoQuerem = 0;
  const vistos = new Set<string>();
  const lista: Destinatario[] = [];
  for (const u of usuarios) {
    if (!categorias.includes(categoriaDe(u))) continue;
    const tel = String(u.phone || '').replace(/\D/g, '');
    if (tel.length < 10) { semTelefone++; continue; }
    if (u.consolidationOptOut) { naoQuerem++; continue; }
    if (vistos.has(tel)) continue; // mesmo número em dois cadastros: uma mensagem só
    vistos.add(tel);
    lista.push({ userId: u.id, nome: u.name || '', telefone: tel, situacao: 'pendente' });
  }
  return { lista, semTelefone, naoQuerem };
}

let rodando = false;
const cancelados = new Set<string>();

export function cancelar(id: string) { cancelados.add(id); }

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Processa a fila. Chamada de tempos em tempos pelo servidor: começa os
 * agendados que venceram e continua os que ficaram pela metade.
 * `pronto()` diz se o WhatsApp está conectado agora.
 */
export async function processarFila(enviar: FuncaoEnvio, pronto: () => boolean) {
  if (rodando || !pronto()) return;
  rodando = true;
  try {
    for (;;) {
      const todos = await storage.readCollection<EnvioMassa>(COLECAO);
      const agora = Date.now();
      const proximo = todos.find(e => e.status === 'enviando')
        || todos.find(e => e.status === 'agendado' && (!e.agendadoPara || Date.parse(e.agendadoPara) <= agora));
      if (!proximo) return;

      await atualizar(proximo.id, e => ({ ...e, status: 'enviando' }));

      for (const d of proximo.destinatarios) {
        if (d.situacao !== 'pendente') continue;
        if (cancelados.has(proximo.id)) break;
        if (!pronto()) return; // WhatsApp caiu: continua na próxima rodada

        let situacao: Destinatario['situacao'] = 'enviado', erro: string | undefined;
        try {
          await enviar(d.telefone, personalizar(proximo.mensagem, d.nome), proximo.imagemUrl);
        } catch (e: any) {
          situacao = 'falhou';
          erro = String(e?.message || e).slice(0, 200);
        }
        await atualizar(proximo.id, e => ({
          ...e,
          destinatarios: e.destinatarios.map(x => x.userId === d.userId && x.telefone === d.telefone ? { ...x, situacao, erro } : x),
        }));
        await esperar(INTERVALO_MIN_MS + Math.random() * (INTERVALO_MAX_MS - INTERVALO_MIN_MS));
      }

      const cancelado = cancelados.delete(proximo.id);
      await atualizar(proximo.id, e => ({ ...e, status: cancelado ? 'cancelado' : 'concluido', concluidoEm: new Date().toISOString() }));
    }
  } catch (e) {
    console.error('[Envio em massa] Falha na fila:', e);
  } finally {
    rodando = false;
  }
}

async function atualizar(id: string, alterar: (e: EnvioMassa) => EnvioMassa) {
  await storage.mutate<EnvioMassa>(COLECAO, todos => {
    const i = todos.findIndex(e => e.id === id);
    if (i < 0) return null;
    const copia = [...todos];
    copia[i] = alterar(todos[i]);
    return copia;
  });
}

/** Resumo sem a lista inteira de telefones, para o painel. */
export function resumo(e: EnvioMassa) {
  const conta = (s: Destinatario['situacao']) => e.destinatarios.filter(d => d.situacao === s).length;
  return {
    id: e.id, mensagem: e.mensagem, imagemUrl: e.imagemUrl, categorias: e.categorias, criadoEm: e.criadoEm,
    agendadoPara: e.agendadoPara, status: e.status, concluidoEm: e.concluidoEm,
    total: e.destinatarios.length, enviados: conta('enviado'), falhas: conta('falhou'), pendentes: conta('pendente'),
    erros: e.destinatarios.filter(d => d.situacao === 'falhou').slice(0, 20).map(d => ({ nome: d.nome, erro: d.erro })),
  };
}
