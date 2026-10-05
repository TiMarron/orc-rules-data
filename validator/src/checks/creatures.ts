import type { Check, Issue } from '../types.js';

const SIZES = new Set(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);
const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => v !== null && typeof v === 'object') : [];

/**
 * What JSON Schema cannot say about a creature:
 *
 * - `own` — in a Strike's effects (also inside a `choice`), in a sense, in a weakness or in a resistance — names one of the
 *   same creature's abilities by its `id`. A dangling one is a rule the stat block promises and
 *   the record does not carry.
 * - Ability ids are unique within the creature, or `own` would be ambiguous.
 * - A size is never a trait: the book prints it in the trait line, but it has no glossary entry,
 *   and the rules compare sizes as a scale. It lives in `size` alone, so the two cannot disagree.
 * - A Strike's `item` is one of the same creature's `items[].item`: a Strike made with something the
 *   creature does not carry is a promise the record does not keep.
 *
 * - A ritual a creature performs `heightened` (`rituals.ranks[].rituals[].heightened`) is performed at a rank
 *   above the rank of the line it stands under: the line says the ritual's own rank, "(5th)" says the
 *   rank the creature raises it to, and a lower or equal one is a heightening that raises nothing.
 * - A rune (`items[].runes[].item`) is a record of category `rune`, when the dataset has the record, and an
 *   entry's own `item` is not one: a longsword among a creature's runes, or a bare rune among its things,
 *   is a link to the wrong record. A grade is a record of its own (`item.striking-greater`, not a
 *   `variants` entry); a record the dataset lacks is the refs check's to report, as is a reference to an
 *   `ability.*` record, not this one's.
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
    list(f.record.strikes).forEach((s, i) => list(s.effects).forEach((e, j) => {
      resolve(e.own, `strikes[${i}].effects[${j}].own`);
      list(e.choice).forEach((c, k) => resolve(c.own, `strikes[${i}].effects[${j}].choice[${k}].own`));
    }));
    const carried = new Set<string>();
    const categoryOf = (id: unknown): unknown => (typeof id === 'string' ? ds.byId.get(id)?.record.category : undefined);
    list(f.record.items).forEach((entry, i) => {
      if (typeof entry.item === 'string') carried.add(entry.item);
      if (categoryOf(entry.item) === 'rune') error(`items[${i}].item: "${String(entry.item)}" is a rune, not something a creature carries on its own`);
      list(entry.runes).forEach((r, j) => {
        const category = categoryOf(r.item);
        if (category !== undefined && category !== 'rune') error(`items[${i}].runes[${j}]: "${String(r.item)}" is ${/^[aeiou]/.test(String(category)) ? 'an' : 'a'} ${String(category)}, not a rune`);
      });
    });
    list(f.record.strikes).forEach((s, i) => {
      if (typeof s.item === 'string' && !carried.has(s.item)) error(`strikes[${i}].item: "${s.item}" is not among this creature's items`);
    });
    const rituals = f.record.rituals as Record<string, unknown> | undefined;
    list(rituals?.ranks).forEach((line, i) => list(line.rituals).forEach((r, j) => {
      if (typeof r.heightened === 'number' && typeof line.rank === 'number' && r.heightened <= line.rank) {
        error(`rituals.ranks[${i}].rituals[${j}].heightened: ${r.heightened} is not above the line's rank ${line.rank}`);
      }
    }));
    const perception = f.record.perception as Record<string, unknown> | undefined;
    list(perception?.senses).forEach((s, i) => resolve(s.own, `perception.senses[${i}].own`));
    for (const key of ['weaknesses', 'resistances']) {
      list(f.record[key]).forEach((e, i) => resolve(e.own, `${key}[${i}].own`));
    }
    const ownTraits = (entries: unknown, name: string, what: string): void => {
      list(entries).forEach((e, i) => {
        if (e.traitValues === null || typeof e.traitValues !== 'object' || Array.isArray(e.traitValues)) return;
        const traits = Array.isArray(e.traits) ? e.traits : [];
        for (const slug of Object.keys(e.traitValues)) {
          if (!traits.includes(slug)) error(`${name}[${i}].traitValues: "${slug}" is not among this ${what}'s traits`);
        }
      });
    };
    ownTraits(f.record.strikes, 'strikes', 'Strike');
    ownTraits(f.record.abilities, 'abilities', 'ability');
    for (const t of Array.isArray(f.record.traits) ? f.record.traits : []) {
      if (typeof t === 'string' && SIZES.has(t)) error(`traits: "${t}" is a size and belongs in "size"`);
    }
  }
  return issues;
};
