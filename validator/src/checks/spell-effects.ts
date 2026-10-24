import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Check, Issue } from '../types.js';

type Obj = Record<string, unknown>;
const list = (value: unknown): Obj[] =>
  Array.isArray(value) ? value.filter((v): v is Obj => v !== null && typeof v === 'object') : [];
const obj = (value: unknown): Obj | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Obj) : undefined;

/** The validator lives in the dataset repository, so its schemas are a fixed distance from this file. */
const SCHEMA_DIR = fileURLToPath(new URL('../../../schema/', import.meta.url));

/** The damage types, read from `creature.schema.json#/$defs/damageType` (through its `$ref`s) so the list lives in one place. */
function damageTypes(): Set<string> {
  const files = new Map<string, Obj>();
  const load = (file: string): Obj => {
    let schema = files.get(file);
    if (!schema) {
      schema = JSON.parse(readFileSync(`${SCHEMA_DIR}${file}`, 'utf8')) as Obj;
      files.set(file, schema);
    }
    return schema;
  };
  const out = new Set<string>();
  const collect = (node: unknown, file: string): void => {
    const n = obj(node);
    if (!n) return;
    if (typeof n.$ref === 'string') {
      const [target, pointer] = n.$ref.split('#');
      const inFile = target || file;
      collect(obj(load(inFile).$defs)?.[pointer.replace('/$defs/', '')], inFile);
    }
    if (typeof n.const === 'string') out.add(n.const);
    if (Array.isArray(n.enum)) for (const v of n.enum) if (typeof v === 'string') out.add(v);
    for (const key of ['anyOf', 'oneOf']) if (Array.isArray(n[key])) for (const v of n[key] as unknown[]) collect(v, file);
  };
  collect({ $ref: 'creature.schema.json#/$defs/damageType' }, 'creature.schema.json');
  return out;
}

/** Conditions the book ends by their own rule (a save each round, getting up, a Strike), so a part needs no duration. */
const SELF_ENDING = new Set(
  ['frightened', 'stunned', 'sickened', 'drained', 'doomed', 'prone', 'grabbed', 'restrained', 'unconscious'].map((n) => `condition.${n}`),
);
const VARIANT_RANGES: Record<string, [number, number]> = { '1-2': [1, 2], '1-3': [1, 3], '2-3': [2, 3] };
const DICE_KINDS = new Set(['damage', 'heal', 'tempHp']);
const VALUE_KINDS = new Set(['condition', 'modifier', 'weakness', 'resistance']);
const TYPED_KINDS = new Set(['damage', 'weakness', 'resistance']);

/**
 * What JSON Schema cannot say about a spell's `effect` block (the record's and each `heightened[i].effect`):
 *
 * - The defense: a block names its own only when the record prints none; an attack (`ac`) applies a part on a
 *   success or critical success only; a part that rides a defense says on which degrees (`on`), except damage,
 *   which has a default scale, `temporaryImmunity`, which holds whatever the result, and `heal`, which never
 *   rides the save (the save of heal or harm is the damage's); `on` without any defense has no roll to read.
 * - A condition has an ending: its own (a short list) or a duration, the part's or the block's.
 * - A burst is aimed at a point within range, so it needs a `range` (a variant may bring its own).
 * - `targets`: `max` not below `min`, and a heightened maximum above the base maximum.
 * - `heighten` fits the part: dice for damage, heal and temporary Hit Points, a flat step for a condition, a
 *   modifier, a weakness and a resistance, nothing for a push or a temporary immunity.
 * - A `heightened[i].effect` replaces the block from a named rank, so the entry's `level` is a rank, not a `+N` step.
 * - `variants` belong to a spell cast with a range of actions (`1-3`) and carry unique counts inside that range.
 * - A damage, weakness or resistance type is a damage type of the creature schema.
 *
 * Whether a `condition.id` exists is the refs check's to report: it reads every id-shaped string of a record.
 */
export const spellEffectsCheck: Check = (ds) => {
  const issues: Issue[] = [];
  const types = damageTypes();
  for (const f of ds.files) {
    if (f.record.type !== 'spell') continue;
    const error = (message: string): void => { issues.push({ level: 'error', file: f.path, message }); };
    const recordDefense = f.record.defense;
    const castActions = obj(f.record.cast)?.actions;

    const checkTargets = (targets: Obj | undefined, at: string): void => {
      if (!targets) return;
      const { min, max } = targets;
      if (typeof min === 'number' && typeof max === 'number' && max < min) error(`${at}.max: ${max} is below the minimum of ${min}`);
      const more = obj(targets.heightenMax);
      if (typeof more?.max === 'number' && typeof max === 'number' && more.max <= max) {
        error(`${at}.heightenMax.max: ${more.max} must exceed the base maximum of ${max}`);
      }
    };

    const checkArea = (area: Obj | undefined, range: unknown, at: string): void => {
      if (area?.shape === 'burst' && range === undefined) error(`${at}: a burst is aimed at a point within range, so it needs a range`);
    };

    const checkParts = (parts: unknown, at: string, defense: unknown, blockDuration: unknown): void => {
      list(parts).forEach((part, i) => {
        const p = `${at}[${i}]`;
        const kind = String(part.kind);
        if (defense === undefined) {
          if (part.on !== undefined) error(`${p}.on: the spell has no defense to roll, so a part has no degrees to apply on`);
        } else if (defense === 'ac') {
          const bad = Array.isArray(part.on) ? part.on.filter((d) => d !== 'success' && d !== 'criticalSuccess') : [];
          if (bad.length > 0) error(`${p}.on: an attack spell's part acts on success or criticalSuccess, not ${bad.join(' or ')}`);
        }
        if (defense !== undefined && part.on === undefined && kind !== 'damage' && kind !== 'temporaryImmunity' && kind !== 'heal') {
          error(`${p}.on: a ${kind} part of a spell with a defense must say on which degrees it applies`);
        }
        if (kind === 'condition' && part.duration === undefined && blockDuration === undefined && !SELF_ENDING.has(String(part.id))) {
          error(`${p}.duration: ${String(part.id)} has no ending of its own, so the part or the spell needs a duration`);
        }
        const heighten = obj(part.heighten);
        if (heighten) {
          if (!DICE_KINDS.has(kind) && !VALUE_KINDS.has(kind)) error(`${p}.heighten: a ${kind} part does not heighten`);
          else if ('dice' in heighten && !DICE_KINDS.has(kind)) error(`${p}.heighten: a ${kind} part grows by a flat value, not by dice`);
          else if ('value' in heighten && !VALUE_KINDS.has(kind)) error(`${p}.heighten: a ${kind} part grows by dice, not by a flat value`);
        }
        if (TYPED_KINDS.has(kind)) {
          const named: [string, unknown][] = [[`${p}.type`, part.type]];
          if (Array.isArray(part.types)) part.types.forEach((t, j) => named.push([`${p}.types[${j}]`, t]));
          for (const [where, t] of named) if (typeof t === 'string' && !types.has(t)) error(`${where}: "${t}" is not a damage type`);
        }
      });
    };

    const checkBlock = (block: Obj, at: string): void => {
      let defense: unknown = recordDefense;
      if (block.defense !== undefined) {
        if (recordDefense !== undefined) error(`${at}.defense: the record already prints a defense; the block names one only when it does not`);
        else defense = block.defense;
      }
      checkTargets(obj(block.targets), `${at}.targets`);
      checkArea(obj(block.area), block.range, `${at}.area`);
      checkParts(block.parts, `${at}.parts`, defense, block.duration);

      if (block.variants === undefined) return;
      const span = typeof castActions === 'string' ? VARIANT_RANGES[castActions] : undefined;
      if (!span) {
        error(`${at}.variants: versions by action count need a spell cast with a range of actions (1-2, 1-3 or 2-3), not ${String(castActions ?? 'no cast.actions')}`);
      }
      const seen = new Map<number, number>();
      list(block.variants).forEach((variant, j) => {
        const v = `${at}.variants[${j}]`;
        const n = variant.actions;
        if (typeof n === 'number') {
          if (span && (n < span[0] || n > span[1])) error(`${v}.actions: ${n} is outside the ${String(castActions)} actions the spell is cast with`);
          const first = seen.get(n);
          if (first !== undefined) error(`${v}.actions: ${n} repeats ${at}.variants[${first}]`);
          else seen.set(n, j);
        }
        checkTargets(obj(variant.targets), `${v}.targets`);
        checkArea(obj(variant.area), variant.range ?? block.range, `${v}.area`);
        if (variant.parts !== undefined) checkParts(variant.parts, `${v}.parts`, defense, block.duration);
      });
    };

    const effect = obj(f.record.effect);
    if (effect) checkBlock(effect, 'effect');
    list(f.record.heightened).forEach((entry, i) => {
      const block = obj(entry.effect);
      if (!block) return;
      const at = `heightened[${i}].effect`;
      if (typeof entry.level === 'string' && entry.level.startsWith('+')) {
        error(`${at}: a block replaces the record's from a named rank, but level "${entry.level}" is a step above the base rank`);
      }
      checkBlock(block, at);
    });
  }
  return issues;
};
