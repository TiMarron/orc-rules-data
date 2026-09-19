import type { Check, Issue } from '../types.js';
import { ID_PATTERN, RECORD_TYPES } from '../types.js';
import { extractRefs, findUnknownTokens, walkStrings } from '../text.js';

const TYPE_PREFIX = new RegExp(`^(${RECORD_TYPES.join('|')})\\.`);

/** Walks an object/array looking for any key named "traits" whose value is an array of strings. */
function walkTraitsArrays(value: unknown, visit: (slugs: string[], path: string) => void, path = ''): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkTraitsArrays(v, visit, `${path}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const childPath = path ? `${path}.${k}` : k;
      if (k === 'traits' && Array.isArray(v) && v.every((x) => typeof x === 'string')) {
        visit(v as string[], childPath);
      } else {
        walkTraitsArrays(v, visit, childPath);
      }
    }
  }
}

export const refsCheck: Check = (ds) => {
  const issues: Issue[] = [];
  const exists = (id: string) => ds.byId.has(id);

  for (const f of ds.files) {
    walkTraitsArrays(f.record, (slugs, path) => {
      const prefix = path === 'traits' ? '' : `${path}: `;
      for (const slug of slugs) {
        if (!exists(`trait.${slug}`)) {
          issues.push({ level: 'error', file: f.path, message: `${prefix}unknown trait "${slug}" (no record trait.${slug})` });
        }
      }
    });
    walkStrings(f.record, (s, path) => {
      if (path === 'id' || path === 'type' || /(^|\.)traits\[\d+\]$/.test(path)) return;
      if (ID_PATTERN.test(s) && TYPE_PREFIX.test(s) && !exists(s)) {
        issues.push({ level: 'error', file: f.path, message: `${path}: reference "${s}" does not resolve` });
      }
    });
  }

  for (const [key, value] of Object.entries(ds.i18n)) {
    for (const ref of extractRefs(value)) {
      if (!exists(ref)) issues.push({ level: 'error', file: 'i18n/en.json', message: `${key}: [[${ref}]] does not resolve` });
    }
    for (const tok of findUnknownTokens(value)) {
      issues.push({ level: 'error', file: 'i18n/en.json', message: `${key}: unknown token ${tok}` });
    }
  }
  return issues;
};
