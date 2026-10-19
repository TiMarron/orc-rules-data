import type { Check, Issue } from '../types.js';

/** Every level the creature-building tables print. */
const LEVELS = Array.from({ length: 26 }, (_, i) => i - 1); // −1 … 24

export const scalesCheck: Check = (ds) => {
  const issues: Issue[] = [];
  for (const f of ds.files) {
    if (f.record.type !== 'scale') continue;
    const rec = f.record as unknown as Record<string, unknown>;
    const tiers = Array.isArray(rec.tiers) ? (rec.tiers as unknown[]).map(String) : [];
    const tiersSet = new Set(tiers);
    const rows = Array.isArray(rec.rows) ? rec.rows : [];

    const present = new Set<number>();
    rows.forEach((row, i) => {
      if (!row || typeof row !== 'object') return;
      const r = row as Record<string, unknown>;
      if (typeof r.level === 'number') present.add(r.level);
      for (const [tier, cell] of Object.entries(r)) {
        if (tier === 'level') continue;
        // `value` is the resistance table's one untiered cell — its columns are Maximum and
        // Minimum, no tiers, the range alone by the spec.
        if (!tiersSet.has(tier) && tier !== 'value') {
          issues.push({ level: 'error', file: f.path, message: `rows[${i}]: tier "${tier}" not in tiers` });
          continue;
        }
        if (cell && typeof cell === 'object' && 'min' in cell && 'max' in cell) {
          const { min, max } = cell as { min: unknown; max: unknown };
          if (typeof min === 'number' && typeof max === 'number' && min > max) {
            issues.push({ level: 'error', file: f.path, message: `rows[${i}].${tier}: min > max` });
          }
        }
      }
    });
    for (const level of LEVELS) {
      if (!present.has(level)) {
        issues.push({ level: 'error', file: f.path, message: `rows: level ${level} missing` });
      }
    }
  }
  return issues;
};
