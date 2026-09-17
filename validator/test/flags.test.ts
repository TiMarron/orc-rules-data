import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { flagsCheck } from '../src/checks/flags.js';
import { writeFixture, trait, record, cleanupFixtures } from './helpers.js';

function issuesFor(json: unknown, folder = 'traits', file = 'trait.flourish.json') {
  return flagsCheck(loadDataset(writeFixture({ records: [{ folder, file, json }] })));
}

function featIssuesFor(json: unknown, file = 'feat.x.json') {
  return flagsCheck(loadDataset(writeFixture({ records: [{ folder: 'feats', file, json }] })));
}

function itemIssuesFor(json: unknown, file = 'item.x.json') {
  return flagsCheck(loadDataset(writeFixture({ records: [{ folder: 'items', file, json }] })));
}

function ancestryIssuesFor(json: unknown, file = 'ancestry.x.json') {
  return flagsCheck(loadDataset(writeFixture({ records: [{ folder: 'ancestries', file, json }] })));
}

function actionIssuesFor(json: unknown, file = 'action.x.json') {
  return flagsCheck(loadDataset(writeFixture({ records: [{ folder: 'actions', file, json }] })));
}

function heritageIssuesFor(json: unknown, file = 'heritage.x.json') {
  return flagsCheck(loadDataset(writeFixture({ records: [{ folder: 'heritages', file, json }] })));
}

function spellIssuesFor(json: unknown, file = 'spell.x.json') {
  return flagsCheck(loadDataset(writeFixture({ records: [{ folder: 'spells', file, json }] })));
}

afterAll(cleanupFixtures);

describe('flags check', () => {
  it('accepts edited: true with a non-blank editNote', () => {
    expect(issuesFor(trait('flourish', { edited: true, editNote: 'Removed a place name' }))).toEqual([]);
  });

  it('rejects edited: true without editNote', () => {
    expect(issuesFor(trait('flourish', { edited: true }))).toEqual([
      { level: 'error', file: 'data/traits/trait.flourish.json', message: 'edited is true but editNote is missing' },
    ]);
  });

  it('accepts edited: false without editNote', () => {
    expect(issuesFor(trait('flourish', { edited: false }))).toEqual([]);
  });

  it('rejects a class feat without "class"', () => {
    expect(
      featIssuesFor(record('feat', 'x', { category: 'class', level: 1 }), 'feat.x.json'),
    ).toEqual([{ level: 'error', file: 'data/feats/feat.x.json', message: 'class feat must set "class"' }]);
  });

  it('rejects an ancestry feat without "ancestry"', () => {
    expect(
      featIssuesFor(record('feat', 'x', { category: 'ancestry', level: 1 }), 'feat.x.json'),
    ).toEqual([{ level: 'error', file: 'data/feats/feat.x.json', message: 'ancestry feat must set "ancestry"' }]);
  });

  it('accepts a general feat without class or ancestry', () => {
    expect(
      featIssuesFor(record('feat', 'x', { category: 'general', level: 1 }), 'feat.x.json'),
    ).toEqual([]);
  });

  it('rejects a class feat whose "class" is not a string', () => {
    expect(
      featIssuesFor(record('feat', 'x', { category: 'class', level: 1, class: 123 }), 'feat.x.json'),
    ).toEqual([{ level: 'error', file: 'data/feats/feat.x.json', message: 'class feat must set "class"' }]);
  });

  it('accepts a class feat whose "class" is a non-empty array', () => {
    expect(
      featIssuesFor(record('feat', 'x', { category: 'class', level: 1, class: ['class.bard', 'class.cleric'] }), 'feat.x.json'),
    ).toEqual([]);
  });

  it('rejects a class feat whose "class" is an empty array', () => {
    expect(
      featIssuesFor(record('feat', 'x', { category: 'class', level: 1, class: [] }), 'feat.x.json'),
    ).toEqual([{ level: 'error', file: 'data/feats/feat.x.json', message: 'class feat must set "class"' }]);
  });

  it('accepts an ancestry feat whose "ancestry" is a non-empty array', () => {
    expect(
      featIssuesFor(record('feat', 'x', { category: 'ancestry', level: 1, ancestry: ['ancestry.elf', 'ancestry.human'] }), 'feat.x.json'),
    ).toEqual([]);
  });

  it('accepts an ancestry feat with versatile: true and no "ancestry"', () => {
    expect(
      featIssuesFor(record('feat', 'x', { category: 'ancestry', level: 1, versatile: true }), 'feat.x.json'),
    ).toEqual([]);
  });

  it('rejects an ancestry feat with neither "ancestry" nor versatile: true', () => {
    expect(
      featIssuesFor(record('feat', 'x', { category: 'ancestry', level: 1 }), 'feat.x.json'),
    ).toEqual([{ level: 'error', file: 'data/feats/feat.x.json', message: 'ancestry feat must set "ancestry"' }]);
  });

  it('accepts an ancestry feat with both "ancestry" and versatile: true', () => {
    expect(
      featIssuesFor(record('feat', 'x', { category: 'ancestry', level: 1, ancestry: 'ancestry.elf', versatile: true }), 'feat.x.json'),
    ).toEqual([]);
  });

  it('rejects a weapon item without a weapon block', () => {
    expect(
      itemIssuesFor(record('item', 'x', { category: 'weapon', level: 0 })),
    ).toEqual([{ level: 'error', file: 'data/items/item.x.json', message: 'weapon item must set "weapon"' }]);
  });

  it('rejects an armor-category item with a shield block instead of an armor block', () => {
    expect(
      itemIssuesFor(
        record('item', 'x', {
          category: 'armor',
          level: 0,
          shield: { acBonus: 2, hardness: 5, hp: 20, bt: 10 },
        }),
      ),
    ).toEqual([
      { level: 'error', file: 'data/items/item.x.json', message: 'armor item must set "armor"' },
      {
        level: 'error',
        file: 'data/items/item.x.json',
        message: '"shield" block requires category "shield", found "armor"',
      },
    ]);
  });

  it('accepts a shield item with a shield block', () => {
    expect(
      itemIssuesFor(
        record('item', 'x', {
          category: 'shield',
          level: 0,
          shield: { acBonus: 2, hardness: 5, hp: 20, bt: 10 },
        }),
      ),
    ).toEqual([]);
  });

  it('rejects an ancestry record without review "human"', () => {
    expect(ancestryIssuesFor(record('ancestry', 'x', { review: 'auto' }))).toEqual([
      { level: 'error', file: 'data/ancestries/ancestry.x.json', message: 'class and ancestry records must have review "human"' },
    ]);
  });

  it('accepts an ancestry record with review "human"', () => {
    expect(ancestryIssuesFor(record('ancestry', 'x', { review: 'human' }))).toEqual([]);
  });

  it('accepts an action that sets "actions"', () => {
    expect(actionIssuesFor(record('action', 'x', { actions: '2' }))).toEqual([]);
  });

  it('accepts an action with no "actions" but the exploration trait', () => {
    expect(actionIssuesFor(record('action', 'x', { traits: ['exploration'] }))).toEqual([]);
  });

  it('accepts an action with no "actions" but the downtime trait', () => {
    expect(actionIssuesFor(record('action', 'x', { traits: ['downtime'] }))).toEqual([]);
  });

  it('accepts an action with no "actions" and variable: true', () => {
    expect(actionIssuesFor(record('action', 'x', { variable: true }))).toEqual([]);
  });

  it('rejects an action with no "actions", no exploration/downtime trait, and no variable', () => {
    expect(actionIssuesFor(record('action', 'x', {}))).toEqual([
      {
        level: 'error',
        file: 'data/actions/action.x.json',
        message: 'action must set "actions", carry the exploration or downtime trait, or set "variable": true',
      },
    ]);
  });

  it('accepts a versatile heritage without "ancestry"', () => {
    expect(heritageIssuesFor(record('heritage', 'x', { versatile: true }))).toEqual([]);
  });

  it('accepts an ancestry-bound heritage', () => {
    expect(heritageIssuesFor(record('heritage', 'x', { ancestry: 'ancestry.dwarf' }))).toEqual([]);
  });

  it('rejects a heritage with neither "ancestry" nor "versatile"', () => {
    expect(heritageIssuesFor(record('heritage', 'x', {}))).toEqual([
      { level: 'error', file: 'data/heritages/heritage.x.json', message: 'heritage must set either "ancestry" or "versatile": true' },
    ]);
  });

  it('rejects a heritage with both "ancestry" and "versatile"', () => {
    expect(heritageIssuesFor(record('heritage', 'x', { ancestry: 'ancestry.dwarf', versatile: true }))).toEqual([
      { level: 'error', file: 'data/heritages/heritage.x.json', message: 'heritage must set either "ancestry" or "versatile": true' },
    ]);
  });

  it('accepts a spell with traditions', () => {
    expect(spellIssuesFor(record('spell', 'x', { traditions: ['arcane'] }))).toEqual([]);
  });

  it('accepts a focus spell without traditions', () => {
    expect(spellIssuesFor(record('spell', 'x', { focus: true }))).toEqual([]);
  });

  it('rejects a non-focus spell without traditions', () => {
    expect(spellIssuesFor(record('spell', 'x', {}))).toEqual([
      { level: 'error', file: 'data/spells/spell.x.json', message: 'spell must set "traditions" unless it is a focus spell' },
    ]);
  });

  it('accepts a focus spell that also has traditions', () => {
    expect(spellIssuesFor(record('spell', 'x', { focus: true, traditions: ['primal'] }))).toEqual([]);
  });

  it('accepts a spell with traditionsVary: true and no traditions', () => {
    expect(spellIssuesFor(record('spell', 'x', { traditionsVary: true }))).toEqual([]);
  });

  it('rejects a non-focus spell with neither traditions nor traditionsVary', () => {
    expect(spellIssuesFor(record('spell', 'x', {}))).toEqual([
      { level: 'error', file: 'data/spells/spell.x.json', message: 'spell must set "traditions" unless it is a focus spell' },
    ]);
  });

  it('accepts a spell that has both traditions and traditionsVary', () => {
    expect(spellIssuesFor(record('spell', 'x', { traditions: ['occult'], traditionsVary: true }))).toEqual([]);
  });
});
