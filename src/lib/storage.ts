import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
console.log(`[Storage] Base directory: ${DATA_DIR}`);

export async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    console.log(`[Storage] Creating data directory: ${DATA_DIR}`);
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export function sanitizeCollectionName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error("Nome de colação inválido.");
  }
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitized || sanitized !== name) {
    throw new Error("Tentativa de injeção ou caracteres inválidos detectados na coleção.");
  }
  return sanitized;
}

/**
 * Cache em memória das coleções.
 *
 * Antes, cada requisição lia o arquivo do disco e reprocessava o JSON inteiro.
 * Com a atualização automática das telas isso acontecia dezenas de vezes por
 * segundo. Agora o disco é lido uma vez e o conteúdo fica em memória.
 *
 * Sempre devolvemos uma CÓPIA: várias partes do servidor alteram os objetos
 * recebidos antes de gravar, e sem a cópia essas alterações contaminariam o
 * cache mesmo sem gravação.
 */
const memoryCache = new Map<string, any[]>();

/**
 * Fila de gravação por coleção.
 *
 * insert, update e remove leem a coleção, alteram e gravam o arquivo inteiro.
 * Duas chamadas ao mesmo tempo liam a mesma versão, e a segunda gravava por
 * cima da primeira — a alteração da primeira sumia. O "Apagar Todos" do painel
 * disparava centenas de exclusões simultâneas e sobravam versículos.
 *
 * Agora toda alteração de uma coleção entra na fila dela e roda uma de cada
 * vez. Coleções diferentes continuam independentes entre si.
 */
const filas = new Map<string, Promise<unknown>>();

function naFila<R>(nome: string, tarefa: () => Promise<R>): Promise<R> {
  const anterior = filas.get(nome) ?? Promise.resolve();
  const atual = anterior.then(tarefa, tarefa);
  // Guarda uma versão que nunca rejeita: um erro não pode travar a fila.
  filas.set(nome, atual.catch(() => undefined));
  return atual;
}

/**
 * Descarta o cache. Obrigatório depois de qualquer operação que altere os
 * arquivos em `data/` por fora daqui — importação de backup, por exemplo,
 * que extrai os arquivos direto do zip.
 */
export function invalidateCache(collectionName?: string): void {
  if (collectionName) {
    memoryCache.delete(collectionName);
    console.log(`[Storage] Cache descartado: ${collectionName}`);
  } else {
    memoryCache.clear();
    console.log('[Storage] Cache descartado por completo');
  }
}

export async function readCollection<T>(collectionName: string): Promise<T[]> {
  const safeCollectionName = sanitizeCollectionName(collectionName);

  const cached = memoryCache.get(safeCollectionName);
  if (cached) return structuredClone(cached) as T[];

  const filePath = path.join(DATA_DIR, `${safeCollectionName}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    memoryCache.set(safeCollectionName, parsed);
    return structuredClone(parsed) as T[];
  } catch {
    // Return default tithe config if requested and doesn't exist
    if (safeCollectionName === 'config') {
      return [{ id: 'tithes', message: 'Tudo o que tenho vem de Ti, e o que das Tuas mãos recebemos, Ti damos.', pixKey: '', churchName: '' }] as any;
    }
    return [];
  }
}

// Grava sem passar pela fila. Só pode ser chamada por quem já está nela.
async function gravar<T>(nome: string, data: T[]): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${nome}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  memoryCache.set(nome, structuredClone(data) as any[]);
}

export async function writeCollection<T>(collectionName: string, data: T[]): Promise<void> {
  const nome = sanitizeCollectionName(collectionName);
  await naFila(nome, () => gravar(nome, data));
}

/**
 * Lê, altera e grava uma coleção sem que outra alteração se intrometa no meio.
 * `alterar` recebe a coleção atual e devolve a nova; devolver `null` significa
 * "nada mudou" e evita a gravação.
 *
 * Use no lugar de readCollection + writeCollection sempre que o valor gravado
 * depender do que já estava lá.
 */
export function mutate<T>(collectionName: string, alterar: (colecao: T[]) => T[] | null | Promise<T[] | null>): Promise<T[]> {
  const nome = sanitizeCollectionName(collectionName);
  return naFila(nome, async () => {
    const colecao = await readCollection<T>(nome);
    const nova = await alterar(colecao);
    if (nova === null) return colecao;
    await gravar(nome, nova);
    return nova;
  });
}

export async function findById<T extends { id: string }>(collectionName: string, id: string): Promise<T | undefined> {
  const collection = await readCollection<T>(collectionName);
  // Compara como texto: registros antigos podem ter id numérico, e o id da URL
  // sempre chega como texto. Com ===, 123 nunca era igual a "123".
  return collection.find(item => String(item.id) === String(id));
}

export async function insert<T extends { id: string }>(collectionName: string, item: T): Promise<T> {
  await mutate<T>(collectionName, collection => {
    collection.push(item);
    return collection;
  });
  return item;
}

export async function update<T extends { id: string }>(collectionName: string, id: string, updates: Partial<T>): Promise<T | undefined> {
  let atualizado: T | undefined;
  await mutate<T>(collectionName, collection => {
    const index = collection.findIndex(item => String(item.id) === String(id));
    if (index === -1) return null;
    // O id do registro nunca muda, mesmo que venha outro nas alterações.
    collection[index] = { ...collection[index], ...updates, id: collection[index].id };
    atualizado = collection[index];
    return collection;
  });
  return atualizado;
}

export async function remove<T extends { id: string }>(collectionName: string, id: string): Promise<boolean> {
  let removeu = false;
  await mutate<T>(collectionName, collection => {
    const filtered = collection.filter(item => String(item.id) !== String(id));
    if (filtered.length === collection.length) return null;
    removeu = true;
    return filtered;
  });
  return removeu;
}
