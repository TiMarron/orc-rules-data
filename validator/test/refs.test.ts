import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { refsCheck } from '../src/checks/refs.js';
import { writeFixture, trait, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

describe('refs check', () => {
  it('passes when traits, id references and [[links]] all resolve', () => {
    const root = writeFixture({
      i18n: { 'feat.x.text': 'See [[trait.flourish|flourish]] {1a}.' },
      records: [
        { folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') },
        { folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { traits: ['flourish'], prerequisites: [{ kind: 'proficiency', target: 'skill.athletics', rank: 'trained' }] }) },
        { folder: 'skills', file: 'skill.athletics.json', json: record('skill', 'athletics') },
      ],
    });
    expect(refsCheck(loadDataset(root))).toEqual([]);
  });

  it('flags an unknown trait slug', () => {
    const root = writeFixture({ records: [{ folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { traits: ['flourish'] }) }] });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual(['unknown trait "flourish" (no record trait.flourish)']);
  });

  it('flags an id-shaped string that does not resolve, with its path', () => {
    const root = writeFixture({ records: [{ folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { prerequisites: [{ kind: 'feat', id: 'feat.missing' }] }) }] });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual(['prerequisites[0].id: reference "feat.missing" does not resolve']);
  });

  it('flags broken [[links]] and unknown tokens inside i18n strings', () => {
    const root = writeFixture({
      i18n: { 'trait.flourish.text': 'See [[condition.nope]] and {9a}.' },
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
    });
    const msgs = refsCheck(loadDataset(root)).map((i) => `${i.file}: ${i.message}`);
    expect(msgs).toEqual([
      'i18n/en.json: trait.flourish.text: [[condition.nope]] does not resolve',
      'i18n/en.json: trait.flourish.text: unknown token {9a}',
    ]);
  });

  it('ignores an id-shaped string whose prefix is not a record type', () => {
    const root = writeFixture({ records: [{ folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { usage: 'foo.bar-baz' }) }] });
    expect(refsCheck(loadDataset(root))).toEqual([]);
  });

  it('flags an unknown trait slug in a nested "traits" array, prefixed with its path', () => {
    const root = writeFixture({
      records: [{ folder: 'items', file: 'item.x.json', json: record('item', 'x', { activation: { actions: '1', traits: ['no-such-trait'] } }) }],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'activation.traits: unknown trait "no-such-trait" (no record trait.no-such-trait)',
    ]);
  });

  it('flags an unresolved id-shaped string inside an array-valued field, with its indexed path', () => {
    const root = writeFixture({
      records: [{ folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { category: 'class', class: ['class.missing'], level: 1 }) }],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'class[0]: reference "class.missing" does not resolve',
    ]);
  });
});
