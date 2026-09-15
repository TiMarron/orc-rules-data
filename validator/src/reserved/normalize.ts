import { createHash } from 'node:crypto';

export const MAX_TERM_WORDS = 4;

function stripTrailingPlural(token: string): string {
  return token.length > 3 && token.endsWith('s') && !token.endsWith('ss') ? token.slice(0, -1) : token;
}

export function normalizeTerm(s: string): string {
  const collapsed = s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']s\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  if (collapsed === '') return '';
  return collapsed.split(' ').map(stripTrailingPlural).join(' ');
}

export function hashTerm(term: string): string {
  return createHash('sha256').update(normalizeTerm(term)).digest('hex');
}

export function ngrams(text: string, maxN = MAX_TERM_WORDS): string[] {
  const tokens = normalizeTerm(text).split(' ').filter(Boolean);
  const out: string[] = [];
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(' '));
  }
  return out;
}

export function parseHashFile(content: string): Set<string> {
  const hashes = new Set<string>();
  content.split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    if (!/^[0-9a-f]{64}$/.test(line)) {
      throw new Error(`reserved/terms.sha256: line ${idx + 1} is not a sha256 hash`);
    }
    hashes.add(line);
  });
  return hashes;
}

export function buildHashFile(terms: string[]): string {
  for (const term of terms) {
    const wordCount = normalizeTerm(term).split(' ').filter(Boolean).length;
    if (wordCount > MAX_TERM_WORDS) {
      throw new Error(`reserved term "${term}" has more than ${MAX_TERM_WORDS} words and can never be matched`);
    }
  }
  const hashes = [...new Set(terms.map(hashTerm))].sort();
  return [
    '# sha256 of normalized reserved terms. The plain-text list is kept privately by maintainers.',
    ...hashes,
    '',
  ].join('\n');
}
