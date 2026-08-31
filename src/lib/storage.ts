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
      return [{ id: 'tithes', message: 'Tudo o que tenho vem de Ti, e o que das Tuas mãos recebemos, Ti damos.', pixKey: 'igrejarenovar@pix.com', churchName: 'Igreja Renovar' }] as any;
    }
    return [];
  }
}

export async function writeCollection<T>(collectionName: string, data: T[]): Promise<void> {
  const safeCollectionName = sanitizeCollectionName(collectionName);
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${safeCollectionName}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  memoryCache.set(safeCollectionName, structuredClone(data) as any[]);
}

export async function findById<T extends { id: string }>(collectionName: string, id: string): Promise<T | undefined> {
  const collection = await readCollection<T>(collectionName);
  return collection.find(item => item.id === id);
}

export async function insert<T extends { id: string }>(collectionName: string, item: T): Promise<T> {
  const collection = await readCollection<T>(collectionName);
  collection.push(item);
  await writeCollection(collectionName, collection);
  return item;
}

export async function update<T extends { id: string }>(collectionName: string, id: string, updates: Partial<T>): Promise<T | undefined> {
  const collection = await readCollection<T>(collectionName);
  const index = collection.findIndex(item => item.id === id);
  if (index === -1) return undefined;
  
  collection[index] = { ...collection[index], ...updates };
  await writeCollection(collectionName, collection);
  return collection[index];
}

export async function remove<T extends { id: string }>(collectionName: string, id: string): Promise<boolean> {
  const collection = await readCollection<T>(collectionName);
  const filtered = collection.filter(item => item.id !== id);
  if (filtered.length === collection.length) return false;
  
  await writeCollection(collectionName, filtered);
  return true;
}
