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
    const traitValues = f.record.traitValues;
    if (traitValues && typeof traitValues === 'object' && !Array.isArray(traitValues)) {
      const own = new Set(Array.isArray(f.record.traits) ? (f.record.traits as unknown[]).filter((t): t is string => typeof t === 'string') : []);
      for (const slug of Object.keys(traitValues)) {
        if (!own.has(slug)) {
          issues.push({ level: 'error', file: f.path, message: `traitValues: "${slug}" is not among this record's traits` });
        }
      }
    }
    const spellcasting = f.record.spellcasting;
    const proficiencies = f.record.proficiencies;
    if (
      spellcasting && typeof spellcasting === 'object' && !Array.isArray(spellcasting) &&
      proficiencies && typeof proficiencies === 'object' && !Array.isArray(proficiencies)
    ) {
      const tradition = (spellcasting as Record<string, unknown>).tradition;
      const traditions = (proficiencies as Record<string, unknown>).traditions;
      const traditionsVary = (proficiencies as Record<string, unknown>).traditionsVary;
      if (traditionsVary === true || !Array.isArray(traditions)) {
        issues.push({
          level: 'error',
          file: f.path,
          message: `spellcasting: ${f.record.id} needs a single tradition of the class's own (proficiencies.traditions)`,
        });
      } else if (typeof tradition === 'string' && !traditions.includes(tradition)) {
        const list = (traditions as unknown[]).map((t) => `"${t}"`).join(', ');
        issues.push({
          level: 'error',
          file: f.path,
          message: `spellcasting.tradition: "${tradition}" is not among ${f.record.id}'s proficiencies.traditions (${list})`,
        });
      }
    }
    // JSON Schema cannot compare two fields of one object, so a oneOf's default is bounded here:
    // a consumer that preselects `sets[default]` must never index past the end.
    if (f.record.type === 'package' && Array.isArray(f.record.options)) {
      (f.record.options as unknown[]).forEach((o, i) => {
        const opt = o as { kind?: unknown; sets?: unknown; default?: unknown };
        if (opt.kind === 'oneOf' && Array.isArray(opt.sets) && typeof opt.default === 'number' && opt.default >= opt.sets.length) {
          issues.push({ level: 'error', file: f.path, message: `options[${i}].default: ${opt.default} is past the last of ${opt.sets.length} sets` });
        }
      });
    }
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
