import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { familiesCheck } from '../src/checks/families.js';
import { writeFixture, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

const family = (slug: string, over: Record<string, unknown> = {}) => ({
  folder: 'families', file: `family.${slug}.json`,
  json: record('family', slug, { text: undefined, ...over }),
});
const creature = (slug: string, over: Record<string, unknown> = {}) => ({
  folder: 'creatures', file: `creature.${slug}.json`,
  json: record('creature', slug, over),
});

const messages = (records: { folder: string; file: string; json: unknown }[]): string[] =>
  familiesCheck(loadDataset(writeFixture({ records }))).map((i) => i.message);

describe('families check', () => {
  it('accepts members whose family names this one back, a group with no members, and a parent that is a family', () => {
    expect(messages([
      family('vampire', { members: ['creature.vampire-count'] }),
      family('dragon', { members: [] }),
      family('dragon-horned', { parent: 'family.dragon', members: ['creature.horned-dragon'] }),
      creature('vampire-count', { family: 'family.vampire' }),
      creature('horned-dragon', { family: 'family.dragon-horned' }),
    ])).toEqual([]);
  });

  it('rejects a member whose own family names another one', () => {
    expect(messages([
      family('vampire', { members: ['creature.drain-touch'] }),
      creature('drain-touch', { family: 'family.ghost' }),
    ])).toEqual([
      'members: "creature.drain-touch" has family "family.ghost"',
    ]);
  });

  it('rejects a creature whose family does not list it among the members', () => {
    expect(messages([
      family('vampire', { members: ['creature.vampire-count'] }),
      creature('vampire-count', { family: 'family.vampire' }),
      creature('drain-touch', { family: 'family.vampire' }),
    ])).toEqual([
      'creature.drain-touch: family "family.vampire" does not list it in members',
    ]);
  });

  it('rejects a creature whose family names a record that is not a family', () => {
    expect(messages([
      creature('vampire-count', { family: 'creature.vampire-count' }),
    ])).toEqual([
      'family: "creature.vampire-count" is not a family',
    ]);
  });

  it('rejects a parent that names a creature or names nothing that is a family', () => {
    expect(messages([
      family('dragon-horned', { parent: 'creature.horned-dragon', members: [] }),
      creature('horned-dragon', {}),
    ])).toEqual([
      'parent: "creature.horned-dragon" is not a family',
    ]);
    expect(messages([
      family('dragon-horned', { parent: 'family.dragon', members: [] }),
    ])).toEqual([
      'parent: "family.dragon" is not a family',
    ]);
  });
});
