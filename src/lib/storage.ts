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

export async function readCollection<T>(collectionName: string): Promise<T[]> {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Return default tithe config if requested and doesn't exist
    if (collectionName === 'config') {
      return [{ id: 'tithes', message: 'Tudo o que tenho vem de Ti, e o que das Tuas mãos recebemos, Ti damos.', pixKey: 'igrejarenovar@pix.com', churchName: 'Igreja Renovar' }] as any;
    }
    return [];
  }
}

export async function writeCollection<T>(collectionName: string, data: T[]): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
