import type { Check, Issue } from '../types.js';
import { walkStrings } from '../text.js';

export const i18nCheck: Check = (ds) => {
  const issues: Issue[] = [];
  const referenced = new Set<string>();

  for (const f of ds.files) {
    const id = f.record.id;
    if (typeof id !== 'string') continue;
    if (f.record.name !== `${id}.name`) {
      issues.push({ level: 'error', file: f.path, message: `name must be "${id}.name"` });
    }
    if (f.record.text !== undefined && f.record.text !== `${id}.text`) {
      issues.push({ level: 'error', file: f.path, message: `text must be "${id}.text"` });
    }
    walkStrings(f.record, (s, path) => {
      if (path === 'id' || !s.startsWith(`${id}.`)) return;
      referenced.add(s);
      if (!(s in ds.i18n)) {
        issues.push({ level: 'error', file: f.path, message: `${path}: i18n key "${s}" missing from i18n/en.json` });
      } else if (ds.i18n[s].trim() === '') {
        issues.push({ level: 'error', file: f.path, message: `${path}: i18n key "${s}" is empty in i18n/en.json` });
      }
    });
  }

  for (const key of Object.keys(ds.i18n)) {
    if (!referenced.has(key)) {
      issues.push({ level: 'error', file: 'i18n/en.json', message: `orphan key "${key}" is not referenced by any record` });
    }
  }
  return issues;
};
