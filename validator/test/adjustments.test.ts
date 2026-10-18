import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { adjustmentsCheck } from '../src/checks/adjustments.js';
import { writeFixture, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

const adjustment = (slug: string, over: Record<string, unknown> = {}) => ({
  folder: 'adjustments', file: `adjustment.${slug}.json`,
  json: record('adjustment', slug, { text: undefined, ...over }),
});
const scale = (slug: string, over: Record<string, unknown> = {}) => ({
  folder: 'scales', file: `scale.${slug}.json`,
  json: record('scale', slug, { text: undefined, ...over }),
});
const creature = (slug: string, abilities: string[], over: Record<string, unknown> = {}) => ({
  folder: 'creatures', file: `creature.${slug}.json`,
  json: record('creature', slug, { abilities: abilities.map((id) => ({ id, section: 'offense' as const, name: `creature.${slug}.abilities.${id}.name` })), ...over }),
});
const ability = (slug: string) => ({
  folder: 'abilities', file: `ability.${slug}.json`,
  json: record('ability', slug),
});

const messages = (records: { folder: string; file: string; json: unknown }[]): string[] =>
  adjustmentsCheck(loadDataset(writeFixture({ records }))).map((i) => i.message);

describe('adjustments check', () => {
  it('accepts a tier the scale carries, in one form or as a pair, wherever the levelValue sits', () => {
    expect(messages([
      adjustment('ghost', {
        level: {
          delta: { scale: 'scale.spell-dc', tier: 'high', delta: -2 },
        },
        resistances: [{ type: 'all-damage', value: { scale: 'scale.spell-dc', tier: ['moderate', 'high'] } }],
      }),
      scale('spell-dc', { tiers: ['extreme', 'high', 'moderate'], rows: [] }),
    ])).toEqual([]);
  });

  it('rejects a levelValue whose tier is not one the named scale record carries', () => {
    expect(messages([
      adjustment('ghost', { resistances: [{ type: 'all-damage', value: { scale: 'scale.spell-dc', tier: 'colossal' } }] }),
      scale('spell-dc', { tiers: ['extreme', 'high', 'moderate'], rows: [] }),
    ])).toEqual([
      'resistances[0].value: scale "scale.spell-dc" has no tier "colossal"',
    ]);
    expect(messages([
      adjustment('ghost', { resistances: [{ type: 'all-damage', value: { scale: 'scale.spell-dc', tier: ['colossal', 'high'] } }] }),
      scale('spell-dc', { tiers: ['extreme', 'high', 'moderate'], rows: [] }),
    ])).toEqual([
      'resistances[0].value: scale "scale.spell-dc" has no tier "colossal"',
    ]);
  });

  it('rejects a byLevel list that repeats or lowers its levels', () => {
    expect(messages([
      adjustment('ghost', { resistances: [{ type: 'all-damage', value: { byLevel: [{ level: 9, value: 10 }, { level: 9, value: 12 }] } }] }),
    ])).toEqual([
      'resistances[0].value: byLevel levels not strictly increasing at 9',
    ]);
  });

  it('rejects an abilities.remove naming an ability one of the targeted creatures does not have', () => {
    expect(messages([
      adjustment('horned-dragon', {
        appliesTo: { creatures: ['creature.drake-red', 'creature.drake-green'] },
        abilities: { remove: ['draconic-frenzy'] },
      }),
      creature('drake-red', ['draconic-frenzy', 'draconic-momentum']),
      creature('drake-green', ['draconic-momentum']),
    ])).toEqual([
      'abilities.remove: "draconic-frenzy" is not an ability of creature.drake-green',
    ]);
  });

  it('rejects an options substituteFor naming an ability one of the targeted creatures does not have', () => {
    expect(messages([
      adjustment('lich', {
        appliesTo: { creatures: ['creature.drake-red'] },
        options: [{
          id: 'alternate-abilities', name: 'adjustment.lich.options.0.name',
          choose: { min: 1, max: 1 },
          substituteFor: ['frightful-presence', 'draconic-frenzy'],
          entries: [{ id: 'corrupting-gaze', section: 'top' as const, name: 'adjustment.lich.options.0.entries.0.name' }],
        }],
      }),
      creature('drake-red', ['frightful-presence']),
    ])).toEqual([
      'options[0].substituteFor: "draconic-frenzy" is not an ability of creature.drake-red',
    ]);
  });

  it('rejects a requires that resolves to a record that is not an adjustment', () => {
    expect(messages([
      adjustment('true-vampire', { appliesTo: { requires: 'ability.grab', minLevel: 5 } }),
      ability('grab'),
    ])).toEqual([
      'appliesTo.requires: "ability.grab" is not an adjustment',
    ]);
  });
});
