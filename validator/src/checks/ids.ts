import { basename } from 'node:path';
import type { Check, Issue } from '../types.js';
import { ID_PATTERN, TYPE_FOLDERS } from '../types.js';

export const idsCheck: Check = (ds) => {
  const issues: Issue[] = [];
  const seen = new Map<string, string>();
  for (const f of ds.files) {
    const id = f.record.id;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      issues.push({ level: 'error', file: f.path, message: `id "${String(id)}" is missing or malformed` });
      continue;
    }
    const type = id.split('.')[0];
    if (f.record.type !== type) {
      issues.push({ level: 'error', file: f.path, message: `type "${String(f.record.type)}" does not match id prefix "${type}"` });
    }
    const folder = TYPE_FOLDERS[type];
    if (folder !== f.folder) {
      issues.push({ level: 'error', file: f.path, message: `record of type "${type}" must live in data/${folder ?? '?'}/, found in data/${f.folder}/` });
    }
    const expectedFile = `${id}.json`;
    if (basename(f.path) !== expectedFile) {
      issues.push({ level: 'error', file: f.path, message: `file name must be "${expectedFile}"` });
    }
    const prev = seen.get(id);
    if (prev) issues.push({ level: 'error', file: f.path, message: `duplicate id "${id}" (also in ${prev})` });
    else seen.set(id, f.path);
  }
  return issues;
};
