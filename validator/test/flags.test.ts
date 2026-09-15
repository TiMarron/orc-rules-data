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
});
