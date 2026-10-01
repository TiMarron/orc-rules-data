import type { Check, Issue } from '../types.js';

const traitsOf = (record: Record<string, unknown> | undefined): unknown[] =>
  Array.isArray(record?.traits) ? (record!.traits as unknown[]) : [];

/**
 * What a consumer needs to hold for the archetype rules to be computable from the data alone:
 *
 * - An archetype lists exactly one dedication feat, and each feat once. The dedication rule
 *   ("two other feats from your current archetype") counts the rest of that list.
 * - `class` is set exactly when that dedication carries the multiclass trait. A multiclass
 *   dedication without it would let a member of the class take it, and nothing would say so.
 * - An archetype never offers a feat below the feat's own level.
 * - Every dedication feat is the dedication of exactly one archetype, and every feat with the
 *   archetype trait belongs to at least one. A feat missing from every list silently escapes both
 *   rules above.
 *
 * A reference that does not resolve is the refs check's to report, not this one's.
 */
export const archetypesCheck: Check = (ds) => {
  const issues: Issue[] = [];
  const memberOf = new Map<string, string[]>();
  for (const f of ds.files) {
    if (f.record.type !== 'archetype' || !Array.isArray(f.record.feats)) continue;
    const seen = new Set<string>();
    const dedications: string[] = [];
    for (const entry of f.record.feats as { level?: unknown; feat?: unknown }[]) {
      if (typeof entry?.feat !== 'string') continue;
      const featId = entry.feat;
      if (seen.has(featId)) {
        issues.push({ level: 'error', file: f.path, message: `feats: ${featId} is listed twice` });
        continue;
      }
      seen.add(featId);
      memberOf.set(featId, [...(memberOf.get(featId) ?? []), f.record.id]);
      const feat = ds.byId.get(featId)?.record;
      if (!feat) continue;
      if (traitsOf(feat).includes('dedication')) dedications.push(featId);
      if (typeof entry.level === 'number' && typeof feat.level === 'number' && entry.level < feat.level) {
        issues.push({ level: 'error', file: f.path, message: `feats: ${featId} is offered at level ${entry.level}, below its own level ${feat.level}` });
      }
    }
    if (dedications.length !== 1) {
      issues.push({
        level: 'error',
        file: f.path,
        message: `feats: an archetype lists exactly one dedication feat, found ${dedications.length}${dedications.length ? ` (${dedications.join(', ')})` : ''}`,
      });
      continue;
    }
    const multiclass = traitsOf(ds.byId.get(dedications[0])?.record).includes('multiclass');
    const hasClass = typeof f.record.class === 'string';
    if (multiclass && !hasClass) {
      issues.push({ level: 'error', file: f.path, message: `class: ${dedications[0]} is a multiclass dedication, so the archetype must name its class` });
    } else if (!multiclass && hasClass) {
      issues.push({ level: 'error', file: f.path, message: `class: only a multiclass archetype names a class, and ${dedications[0]} has no multiclass trait` });
    }
  }
  for (const f of ds.files) {
    if (f.record.type !== 'feat') continue;
    const traits = traitsOf(f.record);
    const archetypes = memberOf.get(f.record.id) ?? [];
    if (traits.includes('dedication') && archetypes.length !== 1) {
      issues.push({
        level: 'error',
        file: f.path,
        message: `a dedication feat belongs to exactly one archetype, found ${archetypes.length}${archetypes.length ? ` (${archetypes.join(', ')})` : ''}`,
      });
    } else if (traits.includes('archetype') && archetypes.length === 0) {
      issues.push({ level: 'error', file: f.path, message: 'an archetype feat must be listed in some archetype\'s feats' });
    }
  }
  return issues;
};
