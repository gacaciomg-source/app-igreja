/**
 * LEITOR DE BÍBLIA EM JSON
 *
 * Os repositórios do GitHub publicam Bíblias em formatos diferentes. Aqui
 * todos viram o mesmo formato: `livros[livro][capítulo][versículo] = texto`,
 * com os 66 livros na ordem protestante (Gênesis = 0 ... Apocalipse = 65).
 *
 * Formatos aceitos:
 *  1. Lista de livros com capítulos em listas de textos
 *     [{ "abbrev": "gn", "chapters": [["No princípio...", "..."], ...] }, ...]
 *  2. Lista plana de versículos (livro em número 1–66 ou pelo nome)
 *     [{ "book": 1, "chapter": 1, "verse": 1, "text": "..." }, ...]
 *     também "livro", "capitulo", "versiculo", "texto", "book_id", "book_name"
 *  3. { "books": [{ "name": "Gênesis", "chapters": [{ "chapter": 1, "verses": [{ "verse": 1, "text": "..." }] }] }] }
 *  4. Listas aninhadas puras: [[["texto", ...], ...], ...]
 *
 * Usado no navegador (antes de enviar) e no servidor (para conferir de novo).
 */

export type TextoBiblia = string[][][];

const NOMES = [
  'gênesis', 'êxodo', 'levítico', 'números', 'deuteronômio', 'josué', 'juízes', 'rute', '1 samuel', '2 samuel',
  '1 reis', '2 reis', '1 crônicas', '2 crônicas', 'esdras', 'neemias', 'ester', 'jó', 'salmos', 'provérbios',
  'eclesiastes', 'cantares', 'isaías', 'jeremias', 'lamentações', 'ezequiel', 'daniel', 'oseias', 'joel', 'amós',
  'obadias', 'jonas', 'miqueias', 'naum', 'habacuque', 'sofonias', 'ageu', 'zacarias', 'malaquias',
  'mateus', 'marcos', 'lucas', 'joão', 'atos', 'romanos', '1 coríntios', '2 coríntios', 'gálatas', 'efésios',
  'filipenses', 'colossenses', '1 tessalonicenses', '2 tessalonicenses', '1 timóteo', '2 timóteo', 'tito', 'filemom',
  'hebreus', 'tiago', '1 pedro', '2 pedro', '1 joão', '2 joão', '3 joão', 'judas', 'apocalipse',
];

// Nomes alternativos comuns (inglês e grafias antigas) e abreviações.
const APELIDOS: Record<string, number> = {
  genesis: 0, exodus: 1, leviticus: 2, numbers: 3, deuteronomy: 4, joshua: 5, judges: 6, ruth: 7,
  psalms: 18, psalm: 18, proverbs: 19, ecclesiastes: 20, 'song of solomon': 21, 'song of songs': 21, 'cântico dos cânticos': 21,
  isaiah: 22, jeremiah: 23, lamentations: 24, ezekiel: 25, hosea: 27, obadiah: 30, jonah: 31, micah: 32, nahum: 33,
  habakkuk: 34, zephaniah: 35, haggai: 36, zechariah: 37, malachi: 38, matthew: 39, mark: 40, luke: 41, john: 42,
  acts: 43, romans: 44, galatians: 47, ephesians: 48, philippians: 49, colossians: 50, titus: 55, philemon: 56,
  hebrews: 57, james: 58, jude: 64, revelation: 65, 'oséias': 27, 'miquéias': 32, 'job': 17,
  gn: 0, ex: 1, 'êx': 1, lv: 2, nm: 3, dt: 4, js: 5, jz: 6, rt: 7, '1sm': 8, '2sm': 9, '1rs': 10, '2rs': 11,
  '1cr': 12, '2cr': 13, ed: 14, ne: 15, et: 16, 'jó': 17, sl: 18, pv: 19, ec: 20, ct: 21, is: 22, jr: 23, lm: 24,
  ez: 25, dn: 26, os: 27, jl: 28, am: 29, ob: 30, jn: 31, mq: 32, na: 33, hc: 34, sf: 35, ag: 36, zc: 37, ml: 38,
  mt: 39, mc: 40, lc: 41, jo: 42, at: 43, rm: 44, '1co': 45, '2co': 46, gl: 47, ef: 48, fp: 49, cl: 50,
  '1ts': 51, '2ts': 52, '1tm': 53, '2tm': 54, tt: 55, fm: 56, hb: 57, tg: 58, '1pe': 59, '2pe': 60,
  '1jo': 61, '2jo': 62, '3jo': 63, jd: 64, ap: 65,
};

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function indiceLivro(v: unknown): number {
  if (typeof v === 'number') return v >= 1 && v <= 66 ? v - 1 : -1;
  if (typeof v !== 'string') return -1;
  const n = v.trim().toLowerCase().replace(/^([123])\s*/, '$1 ').replace(/\s+/g, ' ');
  if (/^\d+$/.test(n)) return indiceLivro(Number(n));
  const i = NOMES.indexOf(n);
  if (i >= 0) return i;
  const j = NOMES.findIndex(x => semAcento(x) === semAcento(n));
  if (j >= 0) return j;
  const compacto = n.replace(/\s/g, '');
  return APELIDOS[n] ?? APELIDOS[compacto] ?? APELIDOS[semAcento(compacto)] ?? -1;
}

const limpar = (t: unknown) => String(t ?? '')
  .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const campo = (o: any, ...nomes: string[]) => { for (const n of nomes) if (o?.[n] !== undefined) return o[n]; return undefined; };

function gravar(livros: TextoBiblia, l: number, c: number, v: number, texto: unknown) {
  if (l < 0 || l > 65 || !(c >= 1) || !(v >= 1)) return;
  const cap = ((livros[l] ||= [])[c - 1] ||= []);
  cap[v - 1] = limpar(texto);
}

/** Converte o JSON para o formato interno. Lança erro em português se não reconhecer. */
export function lerBibliaJson(dados: unknown): TextoBiblia {
  let lista: any = dados;
  if (lista && !Array.isArray(lista)) lista = campo(lista, 'books', 'livros', 'verses', 'versiculos', 'data');
  if (!Array.isArray(lista) || lista.length === 0) throw new Error('Formato não reconhecido: esperava uma lista de livros ou de versículos.');

  const livros: TextoBiblia = [];
  const primeiro = lista[0];

  if (Array.isArray(primeiro)) {
    // 4. [[["texto"]]]
    lista.forEach((cps: any, l: number) => (cps || []).forEach((vs: any, c: number) =>
      (vs || []).forEach((t: any, v: number) => gravar(livros, l, c + 1, v + 1, t))));
  } else if (primeiro && campo(primeiro, 'chapters', 'capitulos') !== undefined) {
    // 1 e 3: lista de livros
    lista.forEach((livro: any, pos: number) => {
      const nome = campo(livro, 'name', 'nome', 'book', 'livro', 'abbrev', 'abreviacao');
      let l = indiceLivro(nome);
      if (l < 0 && typeof campo(livro, 'abbrev') === 'string') l = indiceLivro(livro.abbrev);
      if (l < 0 && lista.length === 66) l = pos; // sem nome reconhecível: vale a ordem
      const cps = campo(livro, 'chapters', 'capitulos') || [];
      cps.forEach((cap: any, ci: number) => {
        if (Array.isArray(cap)) {
          cap.forEach((t: any, vi: number) => gravar(livros, l, ci + 1, vi + 1, typeof t === 'object' ? campo(t, 'text', 'texto') : t));
        } else {
          const c = Number(campo(cap, 'chapter', 'capitulo', 'number', 'numero')) || ci + 1;
          (campo(cap, 'verses', 'versiculos') || []).forEach((vs: any, vi: number) =>
            gravar(livros, l, c, Number(campo(vs, 'verse', 'versiculo', 'number', 'numero')) || vi + 1, typeof vs === 'object' ? campo(vs, 'text', 'texto') : vs));
        }
      });
    });
  } else {
    // 2. lista plana de versículos
    for (const item of lista) {
      const l = indiceLivro(campo(item, 'book', 'book_id', 'livro', 'livro_id', 'book_name', 'nome_livro', 'b'));
      gravar(livros, l,
        Number(campo(item, 'chapter', 'capitulo', 'c')),
        Number(campo(item, 'verse', 'versiculo', 'v')),
        campo(item, 'text', 'texto', 't'));
    }
  }

  // Preenche buracos e confere o mínimo para ser uma Bíblia de verdade.
  for (let l = 0; l < 66; l++) {
    livros[l] = Array.from(livros[l] || [], cap => Array.from(cap || [], t => t || ''));
  }
  const comTexto = livros.filter(l => l.length > 0).length;
  const versiculos = livros.reduce((s, l) => s + l.reduce((a, c) => a + c.filter(Boolean).length, 0), 0);
  if (comTexto === 0 || versiculos < 100) {
    throw new Error('Não encontrei versículos neste arquivo. Confira se é uma Bíblia em JSON.');
  }
  return livros;
}

/** Resumo para mostrar antes de confirmar a importação. */
export function resumoBiblia(livros: TextoBiblia) {
  const livrosComTexto = livros.filter(l => l.length > 0).length;
  const versiculos = livros.reduce((s, l) => s + l.reduce((a, c) => a + c.filter(Boolean).length, 0), 0);
  return { livros: livrosComTexto, versiculos, amostra: livros[42]?.[2]?.[15] || livros[0]?.[0]?.[0] || '' };
}
