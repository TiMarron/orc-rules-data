import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Book, Dataset, RecordEnvelope, RecordFile } from './types.js';

function rel(root: string, path: string): string {
  return relative(root, path).replace(/\\/g, '/');
}

function readJson<T>(root: string, path: string): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (e) {
    throw new Error(`${rel(root, path)}: invalid JSON (${(e as Error).message})`);
  }
}

function bookIssue(entry: unknown): string | undefined {
  if (!entry || typeof entry !== 'object') return 'not an object';
  const e = entry as Record<string, unknown>;
  if (typeof e.id !== 'string' || e.id === '') return 'missing id';
  if (typeof e.title !== 'string') return 'missing title';
  if (!Number.isInteger(e.pages) || (e.pages as number) < 1) return 'pages must be a positive integer';
  if (
    !Array.isArray(e.revisions) ||
    e.revisions.length === 0 ||
    !e.revisions.every((r) => typeof r === 'string' && r !== '')
  ) {
    return 'missing revisions';
  }
  return undefined;
}

function validateBooks(raw: unknown): Book[] {
  if (!Array.isArray(raw)) {
    throw new Error('books.json: top-level value is not an array');
  }
  raw.forEach((entry, index) => {
    const reason = bookIssue(entry);
    if (reason) throw new Error(`books.json: entry ${index} is malformed (${reason})`);
  });
  return raw as Book[];
}

export function loadDataset(root: string): Dataset {
  const books = validateBooks(readJson<unknown>(root, join(root, 'books.json')));
  const i18nPath = join(root, 'i18n', 'en.json');

  const files: RecordFile[] = [];
  const dataDir = join(root, 'data');
  if (existsSync(dataDir)) {
    for (const folder of readdirSync(dataDir).sort()) {
      const folderPath = join(dataDir, folder);
      if (!statSync(folderPath).isDirectory()) continue;
      for (const name of readdirSync(folderPath).sort()) {
        if (!name.endsWith('.json')) continue;
        const path = join(folderPath, name);
        const record = readJson<RecordEnvelope>(root, path);
        if (record === null || typeof record !== 'object' || Array.isArray(record)) {
          throw new Error(`${rel(root, path)}: expected a JSON object at top level`);
        }
        files.push({ path: rel(root, path), folder, record });
      }
    }
  }

  if (files.length > 0 && !existsSync(i18nPath)) {
    throw new Error('i18n/en.json is missing but data/ is not empty');
  }
  const i18n = existsSync(i18nPath) ? readJson<Record<string, string>>(root, i18nPath) : {};

  const byId = new Map<string, RecordFile>();
  for (const f of files) {
    if (typeof f.record.id === 'string' && !byId.has(f.record.id)) byId.set(f.record.id, f);
  }
  return { root, files, byId, i18n, books };
}
