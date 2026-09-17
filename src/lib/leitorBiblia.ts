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

// ---------------- voz neural ----------------

type Manifesto = { ativo: boolean; partes?: { inicio: number; fim: number }[] };

function tocar(url: string, minha: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (minha !== sessao) return resolve(false);
    const audio = new Audio(getAbsoluteUrl(url));
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
  total: number, aoMudar: (i: number) => void): Promise<boolean | null> {
  let manifesto: Manifesto;
  try {
    manifesto = await api.request(`/voz/${biblia}/${livro}/${capitulo}`);
  } catch { return null; }
  if (!manifesto?.ativo || !manifesto.partes?.length) return null;

  const base = `/voz/${biblia}/${livro}/${capitulo}`;
  try {
    aoMudar(-1);
    const { url: anuncio } = await api.request(`${base}/anuncio/${anuncioCurto ? 'curto' : 'longo'}`);
    if (!(await tocar(anuncio, minha))) return false;

    for (let p = 0; p < manifesto.partes.length; p++) {
      if (minha !== sessao) return false;
      // Pede já a próxima parte, para não haver pausa entre elas.
      const atual = api.request(`${base}/parte/${p}`);
      if (p + 1 < manifesto.partes.length) api.request(`${base}/parte/${p + 1}`).catch(() => undefined);
      const { url } = await atual;
      aoMudar(Math.min(manifesto.partes[p].inicio, total - 1));
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

async function lerAparelho(minha: number, anuncio: string, textos: string[], aoMudar: (i: number) => void) {
  const voz = await melhorVoz();
  const falar = (text: string) => TextToSpeech.speak({
    text, lang: 'pt-BR', rate: 0.9, pitch: 1, volume: 1, category: 'playback',
    ...(voz !== undefined ? { voice: voz } : {}),
  });
  if (anuncio) { aoMudar(-1); await falar(anuncio); }
  for (let i = 0; i < textos.length; i++) {
    if (minha !== sessao) return false;
    if (!textos[i]) continue;
    aoMudar(i);
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
}

/**
 * Lê o capítulo. `aoMudar(-1)` = anunciando; `aoMudar(i)` = no versículo i.
 * Devolve true se leu até o fim (e não foi interrompida).
 */
export async function lerCapitulo(pedido: PedidoLeitura, aoMudar: (indice: number) => void): Promise<boolean> {
  const minha = ++sessao;
  const anuncioCurto = !pedido.anuncio.includes(',');
  const neural = await lerNeural(minha, pedido.biblia, pedido.livro, pedido.capitulo, anuncioCurto, pedido.textos.length, aoMudar);
  if (neural !== null) return neural;
  if (minha !== sessao) return false;
  return lerAparelho(minha, pedido.anuncio, pedido.textos, aoMudar);
}

export async function pararLeitura() {
  sessao++;
  if (audioAtual) { audioAtual.pause(); audioAtual.src = ''; audioAtual = null; }
  await TextToSpeech.stop().catch(() => undefined);
}
