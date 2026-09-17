/**
 * BÍBLIA FALADA — lê o capítulo em voz alta com a voz do próprio aparelho.
 *
 * Usa @capacitor-community/text-to-speech: no app Android fala pela voz do
 * Google instalada no celular; no site e no iPhone usa a voz do navegador.
 * Não grava nem baixa áudio, não custa nada e funciona com qualquer versão
 * da Bíblia, inclusive as importadas.
 *
 * Lê um versículo por vez, para a tela poder destacar o que está sendo lido.
 */
import { TextToSpeech } from '@capacitor-community/text-to-speech';

let sessao = 0;

export async function lerVersiculos(textos: string[], aoMudar: (indice: number | null) => void) {
  const minha = ++sessao;
  try {
    for (let i = 0; i < textos.length; i++) {
      if (minha !== sessao) return;
      if (!textos[i]) continue;
      aoMudar(i);
      await TextToSpeech.speak({ text: textos[i], lang: 'pt-BR', rate: 0.95, pitch: 1, volume: 1, category: 'playback' });
    }
  } catch (e) {
    console.warn('[Bíblia falada] Não foi possível ler em voz alta:', e);
    throw e;
  } finally {
    if (minha === sessao) aoMudar(null);
  }
}

export async function pararLeitura() {
  sessao++;
  await TextToSpeech.stop().catch(() => undefined);
}
