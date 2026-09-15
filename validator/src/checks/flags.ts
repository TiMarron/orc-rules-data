import type { Check, Issue } from '../types.js';

export const flagsCheck: Check = (ds) => {
  const issues: Issue[] = [];
  for (const f of ds.files) {
    if (f.record.edited === true) {
      const note = f.record.editNote;
      if (typeof note !== 'string' || note.trim() === '') {
        issues.push({ level: 'error', file: f.path, message: 'edited is true but editNote is missing' });
      }
    }
    // Cross-field rules (a field's requiredness depends on another field's value) live here
    // rather than in JSON Schema: ajv strict mode floods every invalid record with bogus
    // "unevaluated properties" errors when if/then sits next to $ref-typed properties under
    // unevaluatedProperties: false, so these checks are done in TypeScript instead.
    if (f.record.type === 'feat') {
      if (f.record.category === 'class' && typeof f.record.class !== 'string') {
        issues.push({ level: 'error', file: f.path, message: 'class feat must set "class"' });
      }
      if (f.record.category === 'ancestry' && typeof f.record.ancestry !== 'string') {
        issues.push({ level: 'error', file: f.path, message: 'ancestry feat must set "ancestry"' });
      }
    }
    if (f.record.type === 'item') {
      const category = f.record.category;
      for (const block of ['weapon', 'armor', 'shield'] as const) {
        const value = f.record[block];
        const present = typeof value === 'object' && value !== null;
        if (category === block && !present) {
          issues.push({ level: 'error', file: f.path, message: `${block} item must set "${block}"` });
        }
        if (present && category !== block) {
          issues.push({
            level: 'error',
            file: f.path,
            message: `"${block}" block requires category "${block}", found "${String(category)}"`,
          });
        }
      }
    }
    if (f.record.type === 'class' || f.record.type === 'ancestry') {
      if (f.record.review !== 'human') {
        issues.push({ level: 'error', file: f.path, message: 'class and ancestry records must have review "human"' });
      }
    }
  }
  return issues;
};
