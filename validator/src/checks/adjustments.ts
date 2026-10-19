import type { Check, Issue, RecordEnvelope } from '../types.js';

/**
 * Walks an adjustment recording every levelValue — any object that carries a
 * `scale` key — and every `byLevel` list, wherever they sit: a resistance's
 * value, a modify's delta and its limited, an ability's `values`, an option
 * entry's own operations.
 */
function walkLevelValues(
  value: unknown,
  visit: (lv: Record<string, unknown>, path: string) => void,
  path = '',
): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkLevelValues(v, visit, `${path}[${i}]`));
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // A levelValue carries `scale`; a `byLevel` list needs no scale — both are visited.
    if (typeof obj.scale === 'string' || Array.isArray(obj.byLevel)) visit(obj, path);
    for (const [k, v] of Object.entries(value)) {
      const childPath = path ? `${path}.${k}` : k;
      walkLevelValues(v, visit, childPath);
    }
  }
}

function abilityIds(rec: unknown): Set<string> {
  const ids = new Set<string>();
  if (rec && typeof rec === 'object' && Array.isArray((rec as Record<string, unknown>).abilities)) {
    for (const a of (rec as Record<string, unknown>).abilities as { id?: unknown }[]) {
      if (a && typeof a === 'object' && typeof a.id === 'string') ids.add(a.id);
    }
  }
  return ids;
}

export const adjustmentsCheck: Check = (ds) => {
  const issues: Issue[] = [];
  const byId = new Map<string, RecordEnvelope>();
  const creatures = new Map<string, RecordEnvelope>();
  for (const f of ds.files) {
    byId.set(f.record.id, f.record);
    if (f.record.type === 'creature') creatures.set(f.record.id, f.record);
  }

  for (const f of ds.files) {
    if (f.record.type !== 'adjustment') continue;
    const rec = f.record as unknown as Record<string, unknown>;

    walkLevelValues(rec, (lv, path) => {
      const byLevel = lv.byLevel;
      if (Array.isArray(byLevel)) {
        let prev: number | undefined;
        for (const step of byLevel) {
          const level = (step as Record<string, unknown>)?.level;
          if (typeof level === 'number') {
            if (prev !== undefined && level <= prev) {
              issues.push({ level: 'error', file: f.path, message: `${path}: byLevel levels not strictly increasing at ${level}` });
              break;
            }
            prev = level;
          }
        }
      }
      const scaleId = lv.scale;
      if (typeof scaleId !== 'string') return; // a byLevel list without a scale
      const scaleRec = byId.get(scaleId);
      if (!scaleRec || scaleRec.type !== 'scale') return; // refsCheck reports an unresolvable reference
      // A scale whose cells hold two numbers (Spell DC: `{ dc, attack }`) needs the reference to say
      // which; any other scale has one number a cell and no `part`.
      const rows = Array.isArray((scaleRec as Record<string, unknown>).rows) ? ((scaleRec as Record<string, unknown>).rows as Record<string, unknown>[]) : [];
      const paired = rows.some((r) => Object.values(r ?? {}).some((c) => !!c && typeof c === 'object' && 'dc' in (c as object)));
      if (paired && lv.part === undefined) issues.push({ level: 'error', file: f.path, message: `${path}: scale "${scaleId}" holds a DC and an attack per cell; part is required` });
      if (!paired && lv.part !== undefined) issues.push({ level: 'error', file: f.path, message: `${path}: scale "${scaleId}" has one number per cell; part "${String(lv.part)}" names none` });
      const tiers = Array.isArray(scaleRec.tiers) ? scaleRec.tiers : [];
      const printed = Array.isArray(lv.tier)
        ? lv.tier.map((t) => String(t))
        : typeof lv.tier === 'string'
          ? [lv.tier]
          : [];
      for (const tier of printed) {
        if (!tiers.includes(tier)) {
          issues.push({ level: 'error', file: f.path, message: `${path}: scale "${scaleId}" has no tier "${tier}"` });
        }
      }
    });

    const targets = Array.isArray(rec.appliesTo)
      ? []
      : rec.appliesTo && typeof rec.appliesTo === 'object' && Array.isArray((rec.appliesTo as Record<string, unknown>).creatures)
        ? ((rec.appliesTo as Record<string, unknown>).creatures as string[])
        : [];

    const checkRemove = (where: string, value: unknown) => {
      if (!Array.isArray(value)) return;
      for (const cid of targets) {
        const ids = abilityIds(creatures.get(cid));
        for (const abilityId of value) {
          if (typeof abilityId === 'string' && !ids.has(abilityId)) {
            issues.push({ level: 'error', file: f.path, message: `${where}: "${abilityId}" is not an ability of ${cid}` });
          }
        }
      }
    };

    const fromsOf = (abilities: unknown): unknown => {
      const replace = (abilities as Record<string, unknown> | undefined)?.replace;
      return Array.isArray(replace) ? replace.map((r) => (r as Record<string, unknown>)?.from) : undefined;
    };
    checkRemove('abilities.remove', (rec.abilities as Record<string, unknown> | undefined)?.remove);
    checkRemove('abilities.replace', fromsOf(rec.abilities));
    const options = Array.isArray(rec.options) ? rec.options : [];
    options.forEach((o, i) => {
      if (!o || typeof o !== 'object') return;
      checkRemove(`options[${i}].substituteFor`, (o as Record<string, unknown>).substituteFor);
      // An entry's own operations act on the same base creatures (a sin swaps the sinspawn's bite).
      const entries = Array.isArray((o as Record<string, unknown>).entries) ? ((o as Record<string, unknown>).entries as Record<string, unknown>[]) : [];
      entries.forEach((e, j) => {
        checkRemove(`options[${i}].entries[${j}].abilities.remove`, (e?.abilities as Record<string, unknown> | undefined)?.remove);
        checkRemove(`options[${i}].entries[${j}].abilities.replace`, fromsOf(e?.abilities));
      });
    });

    // A dragon age's spell block belongs to a creature the dataset holds — one the adjustment applies to.
    const byCreature = (rec.spellcasting as Record<string, unknown> | undefined)?.byCreature;
    if (byCreature && typeof byCreature === 'object') {
      for (const cid of Object.keys(byCreature)) {
        if (!creatures.has(cid)) issues.push({ level: 'error', file: f.path, message: `spellcasting.byCreature: "${cid}" is not a creature` });
        else if (targets.length && !targets.includes(cid)) issues.push({ level: 'error', file: f.path, message: `spellcasting.byCreature: "${cid}" is not in appliesTo.creatures` });
      }
    }

    const appliesTo = rec.appliesTo;
    if (appliesTo && typeof appliesTo === 'object') {
      const requires = (appliesTo as Record<string, unknown>).requires;
      if (typeof requires === 'string') {
        const req = byId.get(requires);
        if (req && req.type !== 'adjustment') {
          issues.push({ level: 'error', file: f.path, message: `appliesTo.requires: "${requires}" is not an adjustment` });
        }
      }
    }
  }
  return issues;
};
