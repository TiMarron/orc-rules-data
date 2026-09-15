import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { idsCheck } from '../src/checks/ids.js';
import { writeFixture, trait, cleanupFixtures } from './helpers.js';

const run = (records: { folder: string; file: string; json: unknown }[]) =>
  idsCheck(loadDataset(writeFixture({ records }))).map((i) => i.message);

afterAll(cleanupFixtures);

describe('ids check', () => {
  it('passes a well-placed record', () => {
    expect(run([{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }])).toEqual([]);
  });

  it('flags a file name that differs from the id', () => {
    expect(run([{ folder: 'traits', file: 'flourish.json', json: trait('flourish') }]))
      .toEqual(['file name must be "trait.flourish.json"']);
  });

  it('flags a record in the wrong folder', () => {
    expect(run([{ folder: 'feats', file: 'trait.flourish.json', json: trait('flourish') }]))
      .toEqual(['record of type "trait" must live in data/traits/, found in data/feats/']);
  });

  it('flags a type that disagrees with the id prefix', () => {
    expect(run([{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish', { type: 'feat' }) }]))
      .toEqual(['type "feat" does not match id prefix "trait"']);
  });

  it('flags duplicate ids across files', () => {
    const msgs = run([
      { folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') },
      { folder: 'traits', file: 'trait.fortune.json', json: trait('flourish') },
    ]);
    expect(msgs).toContain('duplicate id "trait.flourish" (also in data/traits/trait.flourish.json)');
  });

  it('flags a malformed id', () => {
    expect(run([{ folder: 'traits', file: 'trait.Flourish.json', json: trait('flourish', { id: 'trait.Flourish' }) }]))
      .toEqual(['id "trait.Flourish" is missing or malformed']);
  });
});
