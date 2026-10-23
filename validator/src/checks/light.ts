import type { Check, Issue } from '../types.js';

type Obj = Record<string, unknown>;
const list = (value: unknown): Obj[] =>
  Array.isArray(value) ? value.filter((v): v is Obj => v !== null && typeof v === 'object') : [];
const obj = (value: unknown): Obj | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Obj) : undefined;

/**
 * What JSON Schema cannot say about `light`:
 *
 * - Dim light reaches past the bright light: `dim` is the outer radius of the dim light, so a `dim` no
 *   greater than `bright` sheds no dim light at all.
 * - `as` points at a record that sheds light of its own, with numbers: a record without `light` has
 *   nothing to lend, and a chain of references is a second lookup the consumer would have to follow.
 *   Whether the record exists is the refs check's to report.
 * - The light of an aura fills the aura: the stat block prints the aura's radius once, and the text says
 *   the aura sheds bright (`bright` = `aura`, dim by the book's rule) or dim light (`bright` 0, `dim` = `aura`).
 *
 * The places a `light` stands: the record itself, its `activations`, `heightened` entries and `abilities`.
 */
export const lightCheck: Check = (ds) => {
  const issues: Issue[] = [];
  for (const f of ds.files) {
    const error = (message: string): void => { issues.push({ level: 'error', file: f.path, message }); };
    const visit = (holder: Obj, path: string): void => {
      const light = obj(holder.light);
      if (!light) return;
      const at = path ? `${path}.light` : 'light';
      if (typeof light.as === 'string') {
        const target = ds.byId.get(light.as);
        if (!target) return;
        const own = obj(target.record.light);
        if (!own) error(`${at}.as: ${light.as} sheds no light of its own`);
        else if (typeof own.as === 'string') error(`${at}.as: ${light.as} sheds the light of another record; point at ${own.as}`);
        return;
      }
      const bright = typeof light.bright === 'number' ? light.bright : undefined;
      const dim = typeof light.dim === 'number' ? light.dim : undefined;
      if (bright !== undefined && dim !== undefined && dim <= bright) {
        error(`${at}: dim light (${dim} feet) must reach past the bright light (${bright} feet)`);
      }
      if (typeof holder.aura === 'number') {
        const aura = holder.aura;
        if (light.shape !== 'emanation') error(`${at}: an aura sheds light in an emanation, not a ${String(light.shape)}`);
        else if (!((bright === aura && dim === undefined) || (bright === 0 && dim === aura))) {
          error(`${at}: an aura of ${aura} feet sheds its light in the aura: bright ${aura}, or bright 0 and dim ${aura}`);
        }
      }
    };
    visit(f.record, '');
    for (const key of ['activations', 'heightened', 'abilities']) {
      list(f.record[key]).forEach((entry, i) => visit(entry, `${key}[${i}]`));
    }
  }
  return issues;
};
