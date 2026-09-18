import type { Check, Issue } from '../types.js';

/** True when value is a non-empty string, or a non-empty array (of anything). */
function isSetIdOrIds(value: unknown): boolean {
  if (typeof value === 'string') return value !== '';
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

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
      if (f.record.category === 'class' && !isSetIdOrIds(f.record.class)) {
        issues.push({ level: 'error', file: f.path, message: 'class feat must set "class"' });
      }
      if (f.record.category === 'ancestry' && !isSetIdOrIds(f.record.ancestry) && f.record.versatile !== true) {
        issues.push({ level: 'error', file: f.path, message: 'ancestry feat must set "ancestry"' });
      }
    }
    if (f.record.type === 'action') {
      const traits = Array.isArray(f.record.traits) ? f.record.traits : [];
      const hasExplorationOrDowntime = traits.includes('exploration') || traits.includes('downtime');
      if (f.record.actions === undefined && !hasExplorationOrDowntime && f.record.variable !== true) {
        issues.push({
          level: 'error',
          file: f.path,
          message: 'action must set "actions", carry the exploration or downtime trait, or set "variable": true',
        });
      }
    }
    if (f.record.type === 'spell') {
      if (!isSetIdOrIds(f.record.traditions) && f.record.focus !== true && f.record.traditionsVary !== true) {
        issues.push({ level: 'error', file: f.path, message: 'spell must set "traditions" unless it is a focus spell' });
      }
    }
    if (f.record.type === 'heritage') {
      const hasAncestry = typeof f.record.ancestry === 'string';
      const isVersatile = f.record.versatile === true;
      if (hasAncestry === isVersatile) {
        issues.push({ level: 'error', file: f.path, message: 'heritage must set either "ancestry" or "versatile": true' });
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
      // An activation a consumer cannot spend is unusable data. The book always states one of
      // three things: an action cost, a duration ("1 minute"), or that you Cast a Spell. Across
      // the 941 activations printed in the two remaining core books, 929 state one of them
      // outright; the handful that appear not to are worth a reviewer's eyes, not a silent pass.
      const activations = Array.isArray(f.record.activations) ? f.record.activations : [];
      activations.forEach((a: Record<string, unknown>, i: number) => {
        if (a === null || typeof a !== 'object') return;
        if (a.actions === undefined && a.time === undefined && a.castASpell !== true) {
          issues.push({
            level: 'error',
            file: f.path,
            message: `activations[${i}] must set "actions", "time" or "castASpell": true`,
          });
        }
      });
    }
    if (f.record.type === 'class' || f.record.type === 'ancestry') {
      // These two carry too much of a character to ship on automated cross-checks alone, so the
      // rule is that someone actually looked. It does not insist on a person: `assistant` is a
      // review too, just not a human one, and saying otherwise would push the data to claim a
      // person read it when none did.
      if (f.record.review === 'auto') {
        issues.push({ level: 'error', file: f.path, message: 'class and ancestry records must be reviewed, not "auto"' });
      }
    }
    if (f.record.type === 'background') {
      const skills = Array.isArray(f.record.skills) ? f.record.skills : [];
      const choices = Array.isArray(f.record.choices) ? f.record.choices : [];
      if (skills.length === 0 && choices.length === 0) {
        issues.push({ level: 'error', file: f.path, message: 'background must grant at least one skill, through "skills" or through "choices"' });
      }
    }
  }
  return issues;
};
