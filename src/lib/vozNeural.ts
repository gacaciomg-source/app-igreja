/**
 * BÍBLIA FALADA COM VOZ NEURAL (Azure Speech) — lado do servidor
 *
 * O capítulo é dividido em partes (a primeira bem curta, para começar a tocar
 * em 1–2 s). Cada parte é gerada pela Azure UMA vez e guardada:
 *  - no Cloudflare R2, se configurado (o app toca direto da Cloudflare);
 *  - senão, em data/voz-cache/ neste servidor.
 * Da segunda vez em diante, ninguém gera nada: toca o arquivo guardado.
 *
 * Configuração pelo painel (Integrações), em data/config.json, id "vozNeural".
 * As chaves nunca voltam ao navegador.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AwsClient } from 'aws4fetch';

export interface ConfigVoz {
  ativo: boolean;
  azureKey: string;
  azureRegiao: string;           // ex.: brazilsouth
  voz: 'masculina' | 'feminina';
  r2?: { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; urlPublica: string };
}

export const VOZES = { masculina: 'pt-BR-AntonioNeural', feminina: 'pt-BR-FranciscaNeural' } as const;

const PRIMEIRA_PARTE = 350;   // caracteres: começa a tocar rápido
const DEMAIS_PARTES = 2500;

/** Divide os versículos em partes. Determinístico: o app e o servidor calculam igual. */
export function dividirEmPartes(textos: string[]) {
  const partes: { inicio: number; fim: number }[] = [];
  let inicio = 0, tamanho = 0;
  textos.forEach((t, i) => {
    const limite = partes.length === 0 ? PRIMEIRA_PARTE : DEMAIS_PARTES;
    if (i > inicio && tamanho + t.length > limite) {
      partes.push({ inicio, fim: i - 1 });
      inicio = i; tamanho = 0;
    }
    tamanho += t.length + 1;
  });
  if (textos.length) partes.push({ inicio, fim: textos.length - 1 });
  return partes;
}

const escaparXml = (s: string) => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

/** Gera MP3 com a voz neural. */
export async function sintetizar(cfg: ConfigVoz, texto: string): Promise<Buffer> {
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="pt-BR">`
    + `<voice name="${VOZES[cfg.voz] || VOZES.masculina}"><prosody rate="-8%">${escaparXml(texto)}</prosody></voice></speak>`;
  const r = await fetch(`https://${cfg.azureRegiao}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': cfg.azureKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'app-igreja',
    },
    body: ssml,
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) {
    const detalhe = r.status === 401 ? 'chave ou região da Azure incorreta' : r.status === 429 ? 'limite do plano gratuito atingido neste momento' : `Azure respondeu ${r.status}`;
    throw new Error(detalhe);
  }
  return Buffer.from(await r.arrayBuffer());
}

// ---------- armazenamento (R2 ou disco) ----------

const pastaLocal = () => path.join(process.cwd(), 'data', 'voz-cache');

function clienteR2(cfg: ConfigVoz) {
  const r2 = cfg.r2!;
  return new AwsClient({ accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey, service: 's3', region: 'auto' });
}
const urlEscritaR2 = (cfg: ConfigVoz, chave: string) =>
  `https://${cfg.r2!.accountId}.r2.cloudflarestorage.com/${cfg.r2!.bucket}/${chave}`;
const usaR2 = (cfg: ConfigVoz) => !!(cfg.r2?.accountId && cfg.r2.accessKeyId && cfg.r2.secretAccessKey && cfg.r2.bucket && cfg.r2.urlPublica);

/** Endereço público do arquivo, se já existir. */
async function jaExiste(cfg: ConfigVoz, chave: string, urlLocal: (c: string) => string): Promise<string | null> {
  if (usaR2(cfg)) {
    const publica = `${cfg.r2!.urlPublica.replace(/\/+$/, '')}/${chave}`;
    const r = await fetch(publica, { method: 'HEAD', signal: AbortSignal.timeout(10_000) }).catch(() => null);
    return r?.ok ? publica : null;
  }
  return fs.existsSync(path.join(pastaLocal(), chave)) ? urlLocal(chave) : null;
}

async function guardar(cfg: ConfigVoz, chave: string, mp3: Buffer, urlLocal: (c: string) => string): Promise<string> {
  if (usaR2(cfg)) {
    const r = await clienteR2(cfg).fetch(urlEscritaR2(cfg, chave), {
      method: 'PUT', body: mp3, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
    if (!r.ok) throw new Error(`Cloudflare R2 recusou o envio (${r.status}). Confira as chaves e o bucket.`);
    return `${cfg.r2!.urlPublica.replace(/\/+$/, '')}/${chave}`;
  }
  const destino = path.join(pastaLocal(), chave);
  await fs.promises.mkdir(path.dirname(destino), { recursive: true });
  await fs.promises.writeFile(destino, mp3);
  return urlLocal(chave);
}

// Duas pessoas pedindo a mesma parte ao mesmo tempo: gera uma vez só.
const emAndamento = new Map<string, Promise<string>>();

/** Devolve o endereço do MP3, gerando e guardando se ainda não existir. */
export function obterAudio(cfg: ConfigVoz, chave: string, texto: string, urlLocal: (c: string) => string): Promise<string> {
  const id = `${usaR2(cfg) ? 'r2' : 'local'}:${chave}`;
  if (!emAndamento.has(id)) {
    emAndamento.set(id, (async () => {
      const existente = await jaExiste(cfg, chave, urlLocal);
      if (existente) return existente;
      return guardar(cfg, chave, await sintetizar(cfg, texto), urlLocal);
    })().finally(() => emAndamento.delete(id)));
  }
  return emAndamento.get(id)!;
}

/** Caminho seguro de um arquivo local (sem sair da pasta do cache). */
export function arquivoLocal(chave: string): string | null {
  const alvo = path.resolve(pastaLocal(), chave);
  return alvo.startsWith(path.resolve(pastaLocal()) + path.sep) && fs.existsSync(alvo) ? alvo : null;
}

/** Teste do painel: gera uma frase e envia ao armazenamento escolhido. */
export async function testar(cfg: ConfigVoz, urlLocal: (c: string) => string) {
  const mp3 = await sintetizar(cfg, 'Teste da Bíblia falada. A graça do Senhor Jesus seja com todos.');
  return guardar(cfg, `teste/${cfg.voz}-${Date.now()}.mp3`, mp3, urlLocal);
}
