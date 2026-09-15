import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Check, Issue } from '../types.js';
import { hashTerm, ngrams, parseHashFile } from '../reserved/normalize.js';
import { walkStrings } from '../text.js';

interface AllowEntry {
  term: string;
  reason: string;
}

function isAllowEntry(e: unknown): e is AllowEntry {
  return typeof e === 'object' && e !== null && typeof (e as Record<string, unknown>).term === 'string';
}

function loadAllowlist(allowFile: string): AllowEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(allowFile, 'utf8'));
  } catch (e) {
    throw new Error(`reserved/allowlist.json: invalid JSON (${(e as Error).message})`);
  }
  if (!Array.isArray(parsed) || !parsed.every(isAllowEntry)) {
    throw new Error('reserved/allowlist.json: expected an array of { term, reason }');
  }
  parsed.forEach((e, i) => {
    if (typeof e.reason !== 'string' || e.reason.trim() === '') {
      throw new Error(`reserved/allowlist.json: entry ${i} needs a non-empty "reason"`);
    }
  });
  return parsed;
}

export function loadReserved(root: string): Set<string> {
  const file = join(root, 'reserved', 'terms.sha256');
  if (!existsSync(file)) {
    throw new Error('reserved/terms.sha256 is missing; the Reserved Material scan cannot run');
  }
  const hashes = parseHashFile(readFileSync(file, 'utf8'));
  const allowFile = join(root, 'reserved', 'allowlist.json');
  if (existsSync(allowFile)) {
    for (const e of loadAllowlist(allowFile)) hashes.delete(hashTerm(e.term));
  }
  return hashes;
}

export function scanText(text: string, blocked: Set<string>, cache?: Map<string, string>): string[] {
  const hits = new Set<string>();
  for (const g of ngrams(text)) {
    let h = cache?.get(g);
    if (h === undefined) {
      h = hashTerm(g);
      cache?.set(g, h);
    }
    if (blocked.has(h)) hits.add(g);
  }
  return [...hits];
}

export const reservedCheck: Check = (ds) => {
  const blocked = loadReserved(ds.root);
  const cache = new Map<string, string>();
  const issues: Issue[] = [];
  for (const [key, value] of Object.entries(ds.i18n)) {
    for (const hit of scanText(value, blocked, cache)) issues.push({ level: 'error', file: 'i18n/en.json', message: `${key}: reserved term "${hit}"` });
  }
  for (const f of ds.files) {
    walkStrings(f.record, (s, path) => {
      for (const hit of scanText(s, blocked, cache)) issues.push({ level: 'error', file: f.path, message: `${path}: reserved term "${hit}"` });
    });
    for (const hit of scanText(f.path, blocked, cache)) issues.push({ level: 'error', file: f.path, message: `path: reserved term "${hit}"` });
  }
  return issues;
};
