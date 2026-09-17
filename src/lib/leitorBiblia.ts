/**
 * BÍBLIA FALADA — lê o capítulo em voz alta com a voz do próprio aparelho.
 *
 * Pensada para quem tem dificuldade de ler (pessoas de mais idade):
 *  - lê só o texto, sem falar o número de cada versículo;
 *  - anuncia o capítulo ("Gênesis, capítulo 1") e a tela segue sozinha para o
 *    próximo ao terminar;
 *  - escolhe a voz mais natural em português instalada no aparelho e fala um
 *    pouco mais devagar.
 *
 * Usa @capacitor-community/text-to-speech: no Android, as vozes do Google do
 * celular; no site e no iPhone, as vozes do navegador/sistema. A qualidade
 * depende das vozes instaladas — as "naturais"/"neurais" soam bem melhor.
 */
import { TextToSpeech } from '@capacitor-community/text-to-speech';

let sessao = 0;
let vozEscolhida: number | undefined | null = null; // null = ainda não procurou

/** Índice da voz em português que soa mais natural. */
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
      if (/francisca|thalita|luciana|antonio|daniel|felipe/i.test(nome)) n += 2;
      if (/compact|espeak|robot/i.test(nome)) n -= 8;
      if (n > nota) { nota = n; melhor = i; }
    });
    vozEscolhida = melhor >= 0 ? melhor : undefined;
  } catch {
    vozEscolhida = undefined;
  }
  return vozEscolhida;
}

/**
 * Lê o anúncio e depois os versículos, um por vez.
 * `aoMudar(-1)` = anunciando; `aoMudar(i)` = lendo o versículo i.
 * Devolve true se leu até o fim (e não foi interrompida).
 */
export async function lerCapitulo(anuncio: string, textos: string[], aoMudar: (indice: number) => void): Promise<boolean> {
  const minha = ++sessao;
  const voz = await melhorVoz();
  const falar = (text: string) => TextToSpeech.speak({
    text, lang: 'pt-BR', rate: 0.9, pitch: 1, volume: 1, category: 'playback',
    ...(voz !== undefined ? { voice: voz } : {}),
  });

  if (anuncio) {
    aoMudar(-1);
    await falar(anuncio);
  }
  for (let i = 0; i < textos.length; i++) {
    if (minha !== sessao) return false;
    if (!textos[i]) continue;
    aoMudar(i);
    await falar(textos[i]);
  }
  return minha === sessao;
}

export async function pararLeitura() {
  sessao++;
  await TextToSpeech.stop().catch(() => undefined);
}
