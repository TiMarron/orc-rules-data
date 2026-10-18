import type { Check, Issue, RecordEnvelope } from '../types.js';

/**
 * A family's `members` and its creatures' `family` describe one membership from
 * both ends; a record missing one of the two ends silently is how a drop looks
 * like a match. The validator compares them both ways:
 * a member that names another family, and a creature whose `family` the family record does not list.
 * A member the dataset has no creature record for is dropped at import; the generic
 * reference check (`refsCheck`) catches the id if it ever ships in a record anyway.
 */
export const familiesCheck: Check = (ds) => {
  const issues: Issue[] = [];
  const byId = new Map<string, RecordEnvelope>();
  const families: { id: string; path: string; record: RecordEnvelope }[] = [];
  const creatureFamily = new Map<string, { family: string; path: string }>();

  for (const f of ds.files) {
    const rec = f.record;
    byId.set(rec.id, rec);
    if (rec.type === 'family') families.push({ id: rec.id, path: f.path, record: rec });
    if (rec.type === 'creature') {
      const fam = rec.family;
      if (typeof fam === 'string') creatureFamily.set(rec.id, { family: fam, path: f.path });
    }
  }
  const familyIds = new Set(families.map((f) => f.id));

  for (const f of families) {
    const rec = f.record as unknown as Record<string, unknown>;
    if (typeof rec.parent === 'string' && !familyIds.has(rec.parent)) {
      issues.push({ level: 'error', file: f.path, message: `parent: "${rec.parent}" is not a family` });
    }
    if (Array.isArray(rec.members)) {
      for (const member of rec.members) {
        if (typeof member !== 'string') continue;
        const own = creatureFamily.get(member);
        if (own && own.family !== f.id) {
          issues.push({ level: 'error', file: f.path, message: `members: "${member}" has family "${own.family}"` });
        }
      }
    }
  }

  for (const [creatureId, own] of creatureFamily) {
    const famRec = byId.get(own.family);
    if (!famRec || famRec.type !== 'family') continue; // refsCheck reports an unresolvable reference
    const members = (famRec as unknown as Record<string, unknown>).members;
    if (Array.isArray(members) && members.includes(creatureId)) continue;
    const filePath = ds.files.find((fam) => fam.record === famRec)?.path ?? '(unknown)';
    issues.push({ level: 'error', file: filePath, message: `${creatureId}: family "${own.family}" does not list it in members` });
  }
  return issues;
};
