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

  it('requires `part` on a reference into a two-number scale, and refuses it on any other', () => {
    const spellDc = scale('spell-dc', { tiers: ['high'], rows: [{ level: 1, high: { dc: 17, attack: 9 } }] });
    const skill = scale('skill', { tiers: ['high'], rows: [{ level: 1, high: 8 }] });
    expect(messages([
      adjustment('ghoul', { resistances: [{ type: 'all-damage', value: { scale: 'scale.spell-dc', tier: 'high', part: 'dc' } }] }),
      spellDc,
    ])).toEqual([]);
    expect(messages([
      adjustment('ghoul', { resistances: [{ type: 'all-damage', value: { scale: 'scale.spell-dc', tier: 'high' } }] }),
      spellDc,
    ])).toEqual(['resistances[0].value: scale "scale.spell-dc" holds a DC and an attack per cell; part is required']);
    expect(messages([
      adjustment('ghoul', { resistances: [{ type: 'all-damage', value: { scale: 'scale.skill', tier: 'high', part: 'dc' } }] }),
      skill,
    ])).toEqual(['resistances[0].value: scale "scale.skill" has one number per cell; part "dc" names none']);
  });

  it('rejects a replace, and an option entry’s own remove or replace, naming an ability a targeted creature lacks', () => {
    expect(messages([
      adjustment('sinspawn-sin', {
        appliesTo: { creatures: ['creature.sinspawn'] },
        abilities: { replace: [{ from: 'sinful-gaze', to: { id: 'sinful-gaze', section: 'top', name: 'x.name' } }] },
        options: [{
          id: 'sin', name: 'x.name', choose: { min: 1, max: 1 },
          entries: [{ id: 'envyspawn', section: 'top', name: 'x.name', abilities: { remove: ['claws'], replace: [{ from: 'sinful-bite', to: { id: 'sinful-bite', section: 'top', name: 'x.name' } }] } }],
        }],
      }),
      creature('sinspawn', ['sinful-bite']),
    ])).toEqual([
      'abilities.replace: "sinful-gaze" is not an ability of creature.sinspawn',
      'options[0].entries[0].abilities.remove: "claws" is not an ability of creature.sinspawn',
    ]);
  });

  it('rejects a spell block keyed by no creature, or by one the adjustment does not apply to', () => {
    const block = [{ kind: 'prepared', tradition: 'primal', dc: 26, ranks: [{ rank: 1, spells: [{ spell: 'spell.light' }] }] }];
    expect(messages([
      adjustment('horned-dragon-spellcaster', {
        appliesTo: { creatures: ['creature.young-horned-dragon'] },
        spellcasting: { byCreature: { 'creature.young-horned-dragon': block, 'creature.horned-dragon-young': block, 'creature.adult-horned-dragon': block } },
      }),
      creature('young-horned-dragon', []),
      creature('adult-horned-dragon', []),
    ])).toEqual([
      'spellcasting.byCreature: "creature.horned-dragon-young" is not a creature',
      'spellcasting.byCreature: "creature.adult-horned-dragon" is not in appliesTo.creatures',
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
