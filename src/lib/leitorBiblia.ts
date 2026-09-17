/**
 * BÍBLIA FALADA — lê o capítulo em voz alta.
 *
 * Primeiro tenta a VOZ NEURAL (Azure, configurada no painel em Integrações):
 * soa quase humana. O servidor divide o capítulo em partes, gera cada uma uma
 * única vez e guarda (Cloudflare R2 ou o próprio servidor); aqui só tocamos.
 *
 * Sem voz neural configurada, ou se ela falhar, usa a voz do próprio aparelho
 * (@capacitor-community/text-to-speech).
 *
 * Pensada para quem tem dificuldade de ler: lê só o texto (sem os números dos
 * versículos), anuncia o capítulo e a tela segue sozinha para o próximo.
 */
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { api, getAbsoluteUrl } from '../services/apiService';

let sessao = 0;
let audioAtual: HTMLAudioElement | null = null;

/**
 * O navegador só deixa tocar som logo depois de um toque. A voz neural leva
 * alguns segundos gerando o áudio, e aí o play() saía mudo/bloqueado.
 * Solução: no próprio toque em "Ouvir" (antes de qualquer espera) destravamos
 * UM player tocando silêncio, e ele é reaproveitado para todas as partes.
 */
let playerUnico: HTMLAudioElement | null = null;

function silencioWav(): string {
  const amostras = 800; // ~0,1 s a 8 kHz
  const b = new ArrayBuffer(44 + amostras);
  const v = new DataView(b);
  const txt = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  txt(0, 'RIFF'); v.setUint32(4, 36 + amostras, true); txt(8, 'WAVE'); txt(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  txt(36, 'data'); v.setUint32(40, amostras, true);
  for (let i = 0; i < amostras; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}

/** Chamar DIRETO no toque do botão, antes de qualquer await. */
export function desbloquearAudio() {
  try {
    if (!playerUnico) playerUnico = new Audio();
    playerUnico.src = silencioWav();
    playerUnico.play().catch(() => undefined);
    // Voz do aparelho no navegador: também precisa ser destravada no toque.
    const s = (globalThis as any).speechSynthesis;
    if (s) { const u = new SpeechSynthesisUtterance(''); u.volume = 0; s.speak(u); }
  } catch { /* sem áudio neste ambiente */ }
}

/** Toca um endereço no player já destravado (ex.: botão "Testar voz" do painel). */
export function tocarAgora(url: string) {
  if (!playerUnico) playerUnico = new Audio();
  playerUnico.src = getAbsoluteUrl(url);
  return playerUnico.play();
}

// ---------------- voz neural ----------------

type Manifesto = { ativo: boolean; partes?: { inicio: number; fim: number }[] };

function tocar(url: string, minha: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (minha !== sessao) return resolve(false);
    const audio = playerUnico || new Audio();
    audio.src = getAbsoluteUrl(url);
    audioAtual = audio;
    audio.onended = () => resolve(minha === sessao);
    audio.onerror = () => reject(new Error('Falha ao tocar o áudio'));
    audio.play().catch(reject);
  });
}

/**
 * Lê com a voz neural. Devolve true (terminou), false (interrompida) ou
 * null (voz neural indisponível: quem chamou deve usar a voz do aparelho).
 */
async function lerNeural(minha: number, biblia: string, livro: number, capitulo: number, anuncioCurto: boolean,
  total: number, aoMudar: (i: number, fim?: number) => void, inicio = 0): Promise<boolean | null> {
  let manifesto: Manifesto;
  try {
    manifesto = await api.request(`/voz/${biblia}/${livro}/${capitulo}`);
  } catch { return null; }
  if (!manifesto?.ativo || !manifesto.partes?.length) return null;

  const base = `/voz/${biblia}/${livro}/${capitulo}`;
  try {
    // Continuar de onde pausou: sem repetir o anúncio, a partir do trecho do versículo.
    if (!inicio) {
      aoMudar(-1);
      const { url: anuncio } = await api.request(`${base}/anuncio/${anuncioCurto ? 'curto' : 'longo'}`);
      if (!(await tocar(anuncio, minha))) return false;
    }

    const primeira = Math.max(0, manifesto.partes.findIndex(x => x.fim >= inicio));
    for (let p = primeira; p < manifesto.partes.length; p++) {
      if (minha !== sessao) return false;
      // Pede já a próxima parte, para não haver pausa entre elas.
      const atual = api.request(`${base}/parte/${p}`);
      if (p + 1 < manifesto.partes.length) api.request(`${base}/parte/${p + 1}`).catch(() => undefined);
      const { url } = await atual;
      aoMudar(Math.min(manifesto.partes[p].inicio, total - 1), Math.min(manifesto.partes[p].fim, total - 1));
      if (!(await tocar(url, minha))) return false;
    }
    return minha === sessao;
  } catch (e) {
    if (minha !== sessao) return false;
    console.warn('[Bíblia falada] Voz neural falhou, usando a voz do aparelho:', e);
    return null;
  }
}

// ---------------- voz do aparelho ----------------

let vozEscolhida: number | undefined | null = null;

async function melhorVoz(): Promise<number | undefined> {
  if (vozEscolhida !== null) return vozEscolhida;
  try {
    const { voices } = await TextToSpeech.getSupportedVoices();
    let melhor = -1, nota = -Infinity;
    voices.forEach((v: any, i: number) => {
      const idioma = String(v.lang || '').replace('_', '-').toLowerCase();
      if (!idioma.startsWith('pt')) return;
      const nome = `${v.name || ''} ${v.voiceURI || ''}`;
      let n = 0;
      if (idioma === 'pt-br') n += 5;
      if (/natural|neural|online|enhanced|premium|wavenet|studio/i.test(nome)) n += 10;
      if (/google/i.test(nome)) n += 3;
      if (/antonio|daniel|felipe|francisca|thalita|luciana/i.test(nome)) n += 2;
      if (/compact|espeak|robot/i.test(nome)) n -= 8;
      if (n > nota) { nota = n; melhor = i; }
    });
    vozEscolhida = melhor >= 0 ? melhor : undefined;
  } catch { vozEscolhida = undefined; }
  return vozEscolhida;
}

async function lerAparelho(minha: number, anuncio: string, textos: string[], aoMudar: (i: number, fim?: number) => void, inicio = 0) {
  const voz = await melhorVoz();
  const falar = (text: string) => TextToSpeech.speak({
    text, lang: 'pt-BR', rate: 0.9, pitch: 1, volume: 1, category: 'playback',
    ...(voz !== undefined ? { voice: voz } : {}),
  });
  if (anuncio && !inicio) { aoMudar(-1); await falar(anuncio); }
  for (let i = inicio; i < textos.length; i++) {
    if (minha !== sessao) return false;
    if (!textos[i]) continue;
    aoMudar(i, i);
    await falar(textos[i]);
  }
  return minha === sessao;
}

// ---------------- entrada ----------------

export interface PedidoLeitura {
  biblia: string;          // id da versão
  livro: number;           // 0–65
  capitulo: number;
  anuncio: string;         // "João, capítulo 3" ou "Capítulo 4"
  textos: string[];        // texto de cada versículo (sem número)
  inicio?: number;         // continuar a partir deste versículo (sem anúncio)
}

/**
 * Lê o capítulo. `aoMudar(-1)` = anunciando; `aoMudar(i)` = no versículo i.
 * Devolve true se leu até o fim (e não foi interrompida).
 */
export async function lerCapitulo(pedido: PedidoLeitura, aoMudar: (indice: number, fim?: number) => void): Promise<boolean> {
  const minha = ++sessao;
  const anuncioCurto = !pedido.anuncio.includes(',');
  const inicio = pedido.inicio || 0;
  const neural = await lerNeural(minha, pedido.biblia, pedido.livro, pedido.capitulo, anuncioCurto, pedido.textos.length, aoMudar, inicio);
  if (neural !== null) return neural;
  if (minha !== sessao) return false;
  return lerAparelho(minha, pedido.anuncio, pedido.textos, aoMudar, inicio);
}

export async function pararLeitura() {
  sessao++;
  if (audioAtual) { audioAtual.pause(); audioAtual.src = ''; audioAtual = null; }
  await TextToSpeech.stop().catch(() => undefined);
}
