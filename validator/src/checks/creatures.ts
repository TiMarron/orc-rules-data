import type { Check, Issue } from '../types.js';

const SIZES = new Set(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);
const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => v !== null && typeof v === 'object') : [];

/**
 * What JSON Schema cannot say about a creature:
 *
 * - `own` — in a Strike's effects and in a sense — names one of the same creature's abilities by
 *   its `id`. A dangling one is a rule the stat block promises and the record does not carry.
 * - Ability ids are unique within the creature, or `own` would be ambiguous.
 * - A size is never a trait: the book prints it in the trait line, but it has no glossary entry,
 *   and the rules compare sizes as a scale. It lives in `size` alone, so the two cannot disagree.
 *
 * A reference to an `ability.*` record is the refs check's to report, not this one's.
 */
export const creaturesCheck: Check = (ds) => {
  const issues: Issue[] = [];
  for (const f of ds.files) {
    if (f.record.type !== 'creature') continue;
    const error = (message: string): void => { issues.push({ level: 'error', file: f.path, message }); };
    const own = new Set<string>();
    for (const a of list(f.record.abilities)) {
      if (typeof a.id !== 'string') continue;
      if (own.has(a.id)) error(`abilities: "${a.id}" is listed twice`);
      own.add(a.id);
    }
    const resolve = (value: unknown, path: string): void => {
      if (typeof value === 'string' && !own.has(value)) error(`${path}: "${value}" is not one of this creature's abilities`);
    };
    list(f.record.strikes).forEach((s, i) => list(s.effects).forEach((e, j) => resolve(e.own, `strikes[${i}].effects[${j}].own`)));
    const perception = f.record.perception as Record<string, unknown> | undefined;
    list(perception?.senses).forEach((s, i) => resolve(s.own, `perception.senses[${i}].own`));
    for (const t of Array.isArray(f.record.traits) ? f.record.traits : []) {
      if (typeof t === 'string' && SIZES.has(t)) error(`traits: "${t}" is a size and belongs in "size"`);
    }
  }
  return issues;
};
