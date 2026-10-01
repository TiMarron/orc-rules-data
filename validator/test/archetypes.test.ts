import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { archetypesCheck } from '../src/checks/archetypes.js';
import { writeFixture, record, cleanupFixtures } from './helpers.js';

const feat = (slug: string, level: number, traits: string[]) =>
  ({ folder: 'feats', file: `feat.${slug}.json`, json: record('feat', slug, { category: 'archetype', level, traits, prerequisites: [] }) });

const archetype = (slug: string, over: Record<string, unknown>) =>
  ({ folder: 'archetypes', file: `archetype.${slug}.json`, json: record('archetype', slug, over) });

const DEDICATION = feat('fighter-dedication', 2, ['archetype', 'dedication', 'multiclass']);
const BASIC = feat('basic-maneuver', 4, ['archetype']);
const FIGHTER = archetype('fighter', {
  class: 'class.fighter',
  feats: [{ level: 2, feat: 'feat.fighter-dedication' }, { level: 4, feat: 'feat.basic-maneuver' }],
});

function messages(records: { folder: string; file: string; json: unknown }[]): string[] {
  return archetypesCheck(loadDataset(writeFixture({ records }))).map((i) => `${i.file}: ${i.message}`);
}

afterAll(cleanupFixtures);

describe('archetypes check', () => {
  it('accepts a multiclass archetype that names its class and lists its dedication', () => {
    expect(messages([DEDICATION, BASIC, FIGHTER])).toEqual([]);
  });

  it('rejects a multiclass archetype that does not name its class', () => {
    const { class: _, ...rest } = FIGHTER.json as Record<string, unknown>;
    expect(messages([DEDICATION, BASIC, { ...FIGHTER, json: rest }])).toEqual([
      'data/archetypes/archetype.fighter.json: class: feat.fighter-dedication is a multiclass dedication, so the archetype must name its class',
    ]);
  });

  it('rejects a class on an archetype whose dedication is not multiclass', () => {
    const acrobatDedication = feat('acrobat-dedication', 2, ['archetype', 'dedication']);
    const acrobat = archetype('acrobat', { class: 'class.fighter', feats: [{ level: 2, feat: 'feat.acrobat-dedication' }] });
    expect(messages([acrobatDedication, acrobat])).toEqual([
      'data/archetypes/archetype.acrobat.json: class: only a multiclass archetype names a class, and feat.acrobat-dedication has no multiclass trait',
    ]);
  });

  it('rejects an archetype without a dedication, and the feat it then leaves unlisted', () => {
    const bare = archetype('fighter', { class: 'class.fighter', feats: [{ level: 4, feat: 'feat.basic-maneuver' }] });
    expect(messages([DEDICATION, BASIC, bare])).toEqual([
      'data/archetypes/archetype.fighter.json: feats: an archetype lists exactly one dedication feat, found 0',
      'data/feats/feat.fighter-dedication.json: a dedication feat belongs to exactly one archetype, found 0',
    ]);
  });

  it('rejects a feat offered below its own level', () => {
    const low = archetype('fighter', {
      class: 'class.fighter',
      feats: [{ level: 2, feat: 'feat.fighter-dedication' }, { level: 2, feat: 'feat.basic-maneuver' }],
    });
    expect(messages([DEDICATION, BASIC, low])).toEqual([
      'data/archetypes/archetype.fighter.json: feats: feat.basic-maneuver is offered at level 2, below its own level 4',
    ]);
  });

  it('rejects a feat listed twice', () => {
    const twice = archetype('fighter', {
      class: 'class.fighter',
      feats: [{ level: 2, feat: 'feat.fighter-dedication' }, { level: 4, feat: 'feat.basic-maneuver' }, { level: 6, feat: 'feat.basic-maneuver' }],
    });
    expect(messages([DEDICATION, BASIC, twice])).toEqual([
      'data/archetypes/archetype.fighter.json: feats: feat.basic-maneuver is listed twice',
    ]);
  });

  it('rejects an archetype feat no archetype lists', () => {
    const orphan = feat('opportunist', 4, ['archetype']);
    expect(messages([DEDICATION, BASIC, FIGHTER, orphan])).toEqual([
      'data/feats/feat.opportunist.json: an archetype feat must be listed in some archetype\'s feats',
    ]);
  });

  it('lets a feat belong to several archetypes', () => {
    const archer = archetype('archer', { feats: [{ level: 2, feat: 'feat.archer-dedication' }, { level: 4, feat: 'feat.basic-maneuver' }] });
    expect(messages([DEDICATION, BASIC, FIGHTER, feat('archer-dedication', 2, ['archetype', 'dedication']), archer])).toEqual([]);
  });
});
