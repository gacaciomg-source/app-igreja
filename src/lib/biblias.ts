/**
 * BÍBLIAS DO APP — lado do servidor
 *
 * A lista de versões fica em data/biblias.json e é gerenciada pelo painel:
 * apagar, importar (JSON) e restaurar as de fábrica.
 *
 * Três fontes de texto:
 *  - 'bolls'    → bolls.life (as versões que o app já usava);
 *  - 'bibleapi' → bible-api.com (a Almeida de domínio público);
 *  - 'local'    → arquivo importado pelo painel, em data/biblias/<id>.json.
 *
 * Os capítulos das fontes externas ficam guardados em data/biblias-cache/.
 * Cada capítulo é buscado lá fora uma única vez; depois sai do servidor da
 * igreja, mesmo se o site de origem estiver fora do ar.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { TextoBiblia } from './bibliaJson';

export interface Biblia {
  id: string;
  nome: string;
  sigla: string;
  fonte: 'bolls' | 'bibleapi' | 'local';
  codigo?: string;        // bolls: NAA, NVIPT... | bibleapi: almeida
  dominioPublico?: boolean;
}

export const BIBLIAS_PADRAO: Biblia[] = [
  { id: 'naa', nome: 'NAA (Nova Almeida Atualizada)', sigla: 'NAA', fonte: 'bolls', codigo: 'NAA' },
  { id: 'nvi', nome: 'NVI (Nova Versão Internacional)', sigla: 'NVI', fonte: 'bolls', codigo: 'NVIPT' },
  { id: 'acf', nome: 'Almeida Corrigida Fiel', sigla: 'ACF', fonte: 'bolls', codigo: 'ACF' },
  { id: 'kja', nome: 'King James Atualizada (KJA)', sigla: 'KJA', fonte: 'bolls', codigo: 'KJA' },
  { id: 'ara', nome: 'Almeida ARA (Geral)', sigla: 'ARA', fonte: 'bolls', codigo: 'ARA' },
  { id: 'arc', nome: 'Almeida RC (Tradicional)', sigla: 'ARC', fonte: 'bolls', codigo: 'ARC' },
  { id: 'almeida', nome: 'Almeida (domínio público)', sigla: 'ALM', fonte: 'bibleapi', codigo: 'almeida', dominioPublico: true },
];

// Nomes em inglês que o bible-api.com entende melhor que os em português.
const LIVROS_EN = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const DADOS = () => path.join(process.cwd(), 'data');
const ARQ_LISTA = () => path.join(DADOS(), 'biblias.json');
const ARQ_LOCAL = (id: string) => path.join(DADOS(), 'biblias', `${id}.json`);
const ARQ_CACHE = (id: string, l: number, c: number) => path.join(DADOS(), 'biblias-cache', id, `${l}-${c}.json`);

export const idValido = (id: string) => /^[a-z0-9-]{2,30}$/.test(id);

export async function listarBiblias(): Promise<Biblia[]> {
  try {
    const lista = JSON.parse(await fs.promises.readFile(ARQ_LISTA(), 'utf8'));
    if (Array.isArray(lista)) return lista;
  } catch { /* primeira vez: vale a lista de fábrica */ }
  return BIBLIAS_PADRAO;
}

async function salvarLista(lista: Biblia[]) {
  await fs.promises.mkdir(DADOS(), { recursive: true });
  await fs.promises.writeFile(ARQ_LISTA(), JSON.stringify(lista, null, 2));
}

export async function importarBiblia(nome: string, sigla: string, livros: TextoBiblia): Promise<Biblia> {
  const lista = await listarBiblias();
  const base = (sigla || nome).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'biblia';
  let id = base;
  for (let n = 2; lista.some(b => b.id === id) || !idValido(id); n++) id = `${base}-${n}`.slice(0, 30);
  await fs.promises.mkdir(path.dirname(ARQ_LOCAL(id)), { recursive: true });
  await fs.promises.writeFile(ARQ_LOCAL(id), JSON.stringify(livros));
  const nova: Biblia = { id, nome: nome.slice(0, 80), sigla: (sigla || id).toUpperCase().slice(0, 10), fonte: 'local' };
  await salvarLista([...lista, nova]);
  return nova;
}

export async function removerBiblia(id: string): Promise<boolean> {
  const lista = await listarBiblias();
  const alvo = lista.find(b => b.id === id);
  if (!alvo) return false;
  await salvarLista(lista.filter(b => b.id !== id));
  if (alvo.fonte === 'local') await fs.promises.rm(ARQ_LOCAL(id), { force: true });
  await fs.promises.rm(path.join(DADOS(), 'biblias-cache', id), { recursive: true, force: true });
  return true;
}

/** Devolve as versões de fábrica que foram apagadas; as importadas continuam. */
export async function restaurarPadrao(): Promise<Biblia[]> {
  const lista = await listarBiblias();
  const faltando = BIBLIAS_PADRAO.filter(p => !lista.some(b => b.id === p.id));
  const nova = [...BIBLIAS_PADRAO.filter(p => faltando.includes(p) || lista.some(b => b.id === p.id)), ...lista.filter(b => !BIBLIAS_PADRAO.some(p => p.id === b.id))];
  await salvarLista(nova);
  return nova;
}

const limpar = (t: unknown) => String(t ?? '')
  .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Textos importados ficam na memória depois da primeira leitura (uns 4 MB cada).
const locais = new Map<string, TextoBiblia>();
async function textoLocal(id: string): Promise<TextoBiblia> {
  if (!locais.has(id)) locais.set(id, JSON.parse(await fs.promises.readFile(ARQ_LOCAL(id), 'utf8')));
  return locais.get(id)!;
}
export function esquecerLocal(id: string) { locais.delete(id); }

async function buscarFora(b: Biblia, livro: number, cap: number): Promise<string[]> {
  if (b.fonte === 'bolls') {
    const r = await fetch(`https://bolls.life/get-text/${b.codigo}/${livro + 1}/${cap}/`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`bolls ${r.status}`);
    const dados = await r.json();
    const vs: string[] = [];
    for (const v of dados) vs[v.verse - 1] = limpar(v.text);
    return Array.from(vs, t => t || '');
  }
  const r = await fetch(`https://bible-api.com/${encodeURIComponent(LIVROS_EN[livro])}+${cap}?translation=${b.codigo}`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`bible-api ${r.status}`);
  const dados = await r.json();
  const vs: string[] = [];
  for (const v of dados.verses || []) vs[v.verse - 1] = limpar(v.text);
  return Array.from(vs, t => t || '');
}

/** Versículos de um capítulo (livro 0–65, capítulo a partir de 1). Lista vazia se não existir. */
export async function lerCapitulo(id: string, livro: number, cap: number): Promise<{ verse: number; text: string }[]> {
  const b = (await listarBiblias()).find(x => x.id === id);
  if (!b) throw new Error('Versão não encontrada');
  let textos: string[];
  if (b.fonte === 'local') {
    textos = (await textoLocal(id))[livro]?.[cap - 1] || [];
  } else {
    const arq = ARQ_CACHE(id, livro, cap);
    try {
      textos = JSON.parse(await fs.promises.readFile(arq, 'utf8'));
    } catch {
      textos = await buscarFora(b, livro, cap);
      if (textos.some(Boolean)) {
        await fs.promises.mkdir(path.dirname(arq), { recursive: true });
        await fs.promises.writeFile(arq, JSON.stringify(textos));
      }
    }
  }
  return textos.map((text, i) => ({ verse: i + 1, text })).filter(v => v.text);
}

/** Busca por palavra numa versão importada. Até 100 resultados. */
export async function buscarLocal(id: string, termo: string) {
  const alvo = termo.toLowerCase();
  const livros = await textoLocal(id);
  const achados: { livro: number; chapter: number; verse: number; text: string }[] = [];
  for (let l = 0; l < livros.length && achados.length < 100; l++) {
    for (let c = 0; c < (livros[l] || []).length && achados.length < 100; c++) {
      livros[l][c].forEach((t, v) => { if (achados.length < 100 && t.toLowerCase().includes(alvo)) achados.push({ livro: l, chapter: c + 1, verse: v + 1, text: t }); });
    }
  }
  return achados;
}
