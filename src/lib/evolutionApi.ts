/**
 * WHATSAPP PELA EVOLUTION API (v2)
 *
 * Substitui o WhatsApp de hoje (whatsapp-web.js, que abre um Chrome escondido
 * por igreja) por chamadas a uma Evolution API instalada à parte — ver
 * GUIA_EVOLUTION_API.md. Configurado pelo painel: Integrações.
 *
 * ClienteEvolution imita as funções do cliente antigo que o servidor usa
 * (sendMessage, getNumberId, logout, destroy). Assim os ~30 pontos que mandam
 * mensagem continuam iguais: só muda quem está atrás de `whatsappClient`.
 *
 * Mensagens recebidas chegam por webhook (a Evolution chama o nosso servidor)
 * e são convertidas por `mensagemDoWebhook` para o formato que o Atendimento
 * já entende.
 */

export interface ConfigEvolution {
  ativo: boolean;
  url: string;          // ex.: https://evolution.suaigreja.com.br
  apiKey: string;       // AUTHENTICATION_API_KEY da Evolution
  instancia: string;    // nome da instância desta igreja, ex.: igreja-renovar
  segredoWebhook: string;
}

export type EstadoEvolution = 'open' | 'connecting' | 'close' | 'inexistente';

const EVENTOS = ['MESSAGES_UPSERT'];

export class ClienteEvolution {
  constructor(private cfg: ConfigEvolution) {}

  private get base() { return this.cfg.url.replace(/\/+$/, ''); }
  private get inst() { return encodeURIComponent(this.cfg.instancia); }

  private async chamar(metodo: string, caminho: string, corpo?: unknown) {
    const r = await fetch(this.base + caminho, {
      method: metodo,
      headers: { apikey: this.cfg.apiKey, 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(30_000),
    });
    const texto = await r.text();
    let dados: any = null;
    try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
    if (!r.ok) {
      const erro: any = new Error(`Evolution API respondeu ${r.status}: ${String(texto).slice(0, 200)}`);
      erro.status = r.status;
      throw erro;
    }
    return dados;
  }

  /** "5531999999999@c.us" → "5531999999999" */
  private numero(chatId: string) { return String(chatId).split('@')[0].replace(/\D/g, ''); }

  /** Confere endereço e chave: lista as instâncias do servidor Evolution. */
  async testarAcesso() { await this.chamar('GET', '/instance/fetchInstances'); }

  async estado(): Promise<EstadoEvolution> {
    try {
      const r = await this.chamar('GET', `/instance/connectionState/${this.inst}`);
      return (r?.instance?.state || r?.state || 'close') as EstadoEvolution;
    } catch (e: any) {
      if (e.status === 404) return 'inexistente';
      throw e;
    }
  }

  async criarInstancia(webhookUrl: string) {
    return this.chamar('POST', '/instance/create', {
      instanceName: this.cfg.instancia,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: { url: webhookUrl, byEvents: false, base64: false, events: EVENTOS },
    });
  }

  async definirWebhook(webhookUrl: string) {
    return this.chamar('POST', `/webhook/set/${this.inst}`, {
      webhook: { enabled: true, url: webhookUrl, byEvents: false, base64: false, events: EVENTOS },
    });
  }

  /** Pede o QR Code de conexão. Devolve a imagem em base64 (data URL), se houver. */
  async conectar(): Promise<string | null> {
    const r = await this.chamar('GET', `/instance/connect/${this.inst}`);
    const b64 = r?.base64 || r?.qrcode?.base64 || null;
    if (!b64) return null;
    return String(b64).startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
  }

  // ---- mesmas funções do cliente antigo ----

  async sendMessage(chatId: string, conteudo: any, opcoes?: { caption?: string }) {
    const number = this.numero(chatId);
    let r: any;
    if (conteudo && typeof conteudo === 'object' && 'mimetype' in conteudo && 'data' in conteudo) {
      // MessageMedia (imagem, vídeo ou arquivo)
      const tipo = String(conteudo.mimetype);
      r = await this.chamar('POST', `/message/sendMedia/${this.inst}`, {
        number,
        mediatype: tipo.startsWith('image') ? 'image' : tipo.startsWith('video') ? 'video' : 'document',
        mimetype: tipo,
        media: conteudo.data,
        fileName: conteudo.filename || 'arquivo',
        caption: opcoes?.caption || '',
      });
    } else if (conteudo && typeof conteudo === 'object' && 'pollName' in conteudo) {
      // Poll (enquete)
      r = await this.chamar('POST', `/message/sendPoll/${this.inst}`, {
        number,
        name: conteudo.pollName,
        selectableCount: 1,
        values: (conteudo.pollOptions || []).map((o: any) => o.name ?? String(o)),
      });
    } else {
      r = await this.chamar('POST', `/message/sendText/${this.inst}`, { number, text: String(conteudo) });
    }
    const id = r?.key?.id;
    return { id: { _serialized: id, id } };
  }

  async getNumberId(numero: string) {
    const r = await this.chamar('POST', `/chat/whatsappNumbers/${this.inst}`, { numbers: [this.numero(numero)] });
    const item = Array.isArray(r) ? r[0] : null;
    if (!item?.exists) return null;
    return { _serialized: String(item.jid).replace('@s.whatsapp.net', '@c.us') };
  }

  async logout() { await this.chamar('DELETE', `/instance/logout/${this.inst}`); }

  /** Nada a fechar: a sessão fica guardada na própria Evolution. */
  async destroy() { /* sem Chrome local */ }
}

/**
 * Converte o aviso de mensagem recebida (evento messages.upsert) no formato
 * do cliente antigo, que o Atendimento já trata. Devolve null para o que não
 * é mensagem de alguém para a igreja: mensagens enviadas por nós, grupos,
 * status, reações, confirmações de leitura e outros eventos sem conteúdo.
 */
export function mensagemDoWebhook(corpo: any) {
  const evento = String(corpo?.event || '').toLowerCase().replace(/_/g, '.');
  if (evento !== 'messages.upsert') return null;
  const d = Array.isArray(corpo.data) ? corpo.data[0] : corpo.data;
  const key = d?.key || {};
  if (!key.remoteJid || key.fromMe) return null;

  const jid = String(key.remoteJid);
  if (/@g\.us$|@broadcast$|@newsletter$/.test(jid) || jid === 'status@broadcast') return null;

  // Novo identificador do WhatsApp (@lid) esconde o telefone. Quando a
  // Evolution manda o número real em outro campo, usamos ele — senão o
  // atendimento aparecia com um número estranho e a resposta não chegava.
  const comTelefone = [key.senderPn, key.remoteJidAlt, d.remoteJidAlt, key.participantPn, jid]
    .map((x: any) => String(x || ''))
    .find(x => /@s\.whatsapp\.net$|@c\.us$/.test(x));
  const from = (comTelefone || jid).replace('@s.whatsapp.net', '@c.us');

  // Mensagens "embrulhadas": temporária, visualização única, documento com legenda, editada.
  let m: any = d.message || {};
  for (let i = 0; i < 5; i++) {
    const dentro = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message
      || m.viewOnceMessageV2Extension?.message || m.documentWithCaptionMessage?.message
      || m.editedMessage?.message?.protocolMessage?.editedMessage || m.editedMessage?.message;
    if (!dentro) break;
    m = dentro;
  }

  const texto = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption
    || m.documentMessage?.caption || m.buttonsResponseMessage?.selectedDisplayText
    || m.listResponseMessage?.title || m.templateButtonReplyMessage?.selectedDisplayText || '';
  const midia = m.imageMessage ? '📷 Imagem' : m.videoMessage ? '🎥 Vídeo' : m.audioMessage ? '🎤 Áudio'
    : m.documentMessage ? '📄 Documento' : m.stickerMessage ? 'Figurinha' : m.locationMessage ? '📍 Localização'
    : m.contactMessage ? '👤 Contato' : (m.pollCreationMessage || m.pollCreationMessageV3) ? '📊 Enquete' : '';
  const body = texto && midia ? `[${midia}] ${texto}` : texto || (midia ? `[${midia}]` : '');
  if (!body) return null; // reação, leitura, sistema: não vira atendimento em branco

  const nome = d.pushName || '';
  return {
    from,
    body,
    type: 'chat',
    id: { _serialized: key.id, id: key.id },
    getContact: async () => ({ name: nome, pushname: nome, number: from.split('@')[0] }),
  };
}
