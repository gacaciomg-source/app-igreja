/**
 * LEITURA DE VERSÍCULOS EM CSV
 *
 * Usado pela importação em massa do painel (AdminVerses). A primeira linha
 * precisa ser o cabeçalho. Aceita vírgula, ponto e vírgula ou tabulação como
 * separador — o Excel em português salva com ponto e vírgula — e campos entre
 * aspas, que podem conter o próprio separador.
 *
 * Colunas reconhecidas, sem diferença de maiúscula ou acento:
 *   referencia (ou ref)            → "Hebreus 11:1"
 *   livro + capitulo + versiculo   → montam a referência quando não há a coluna acima
 *   texto                          → opcional; sem ele, o texto é buscado na Bíblia
 *   tema                           → opcional; guardado junto com o versículo
 * Qualquer outra coluna (id, dia...) é ignorada.
 */

export interface VersiculoImportado {
  ref: string;
  text: string;
  theme?: string;
}

const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function lerCsvVersiculos(conteudo: string): VersiculoImportado[] {
  const linhas = conteudo
    .replace(/^﻿/, '')          // BOM que o Excel coloca no início
    .replace(/\r/g, '')
    .split('\n')
    .filter(l => l.trim().length > 0);
  if (linhas.length < 2) return [];

  // O separador é o que mais divide o cabeçalho.
  const cabecalho = linhas[0];
  const sep = [';', '\t', ','].sort((a, b) => cabecalho.split(b).length - cabecalho.split(a).length)[0];

  const campos = (linha: string): string[] => {
    const out: string[] = [];
    let atual = '';
    let entreAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') {
        if (entreAspas && linha[i + 1] === '"') { atual += '"'; i++; }   // "" vira "
        else entreAspas = !entreAspas;
      } else if (c === sep && !entreAspas) {
        out.push(atual);
        atual = '';
      } else {
        atual += c;
      }
    }
    out.push(atual);
    return out.map(s => s.trim());
  };

  const nomes = campos(cabecalho).map(semAcento);
  const coluna = (...opcoes: string[]) => nomes.findIndex(n => opcoes.includes(n));
  const iRef = coluna('referencia', 'ref');
  const iLivro = coluna('livro');
  const iCapitulo = coluna('capitulo');
  const iVersiculo = coluna('versiculo', 'versiculos');
  const iTexto = coluna('texto', 'text');
  const iTema = coluna('tema', 'theme');

  if (iRef < 0 && (iLivro < 0 || iCapitulo < 0 || iVersiculo < 0)) {
    throw new Error('O CSV precisa de uma coluna "referencia" (ou das colunas "livro", "capitulo" e "versiculo").');
  }

  return linhas.slice(1)
    .map(linha => {
      const c = campos(linha);
      let ref = iRef >= 0 ? (c[iRef] || '') : '';
      if (!ref && c[iLivro] && c[iCapitulo] && c[iVersiculo]) {
        ref = `${c[iLivro]} ${c[iCapitulo]}:${c[iVersiculo]}`;
      }
      const item: VersiculoImportado = { ref: ref.trim(), text: iTexto >= 0 ? (c[iTexto] || '') : '' };
      if (iTema >= 0 && c[iTema]) item.theme = c[iTema];
      return item;
    })
    .filter(v => v.ref);
}
