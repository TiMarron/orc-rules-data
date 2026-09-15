export const ACTION_TOKENS = new Set(['{1a}', '{2a}', '{3a}', '{r}', '{f}']);
const REF_RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
const TOKEN_RE = /\{[^{}\s]{1,4}\}/g;

export function extractRefs(text: string): string[] {
  return [...text.matchAll(REF_RE)].map((m) => m[1].trim());
}

export function findUnknownTokens(text: string): string[] {
  return [...text.matchAll(TOKEN_RE)].map((m) => m[0]).filter((t) => !ACTION_TOKENS.has(t));
}

export function walkStrings(value: unknown, visit: (s: string, path: string) => void, path = ''): void {
  if (typeof value === 'string') {
    visit(value, path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, visit, `${path}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkStrings(v, visit, path ? `${path}.${k}` : k);
  }
}
