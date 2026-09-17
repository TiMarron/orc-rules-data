import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { i18nCheck } from '../src/checks/i18n.js';
import { writeFixture, trait, traitI18n, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

describe('i18n check', () => {
  it('passes when every key used by a record exists and no key is orphaned', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'One per turn.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
    });
    expect(i18nCheck(loadDataset(root))).toEqual([]);
  });

  it('flags a key used by a record but missing from en.json', () => {
    const root = writeFixture({
      i18n: { 'trait.flourish.name': 'Flourish' },
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
    });
    expect(i18nCheck(loadDataset(root)).map((i) => i.message))
      .toEqual(['text: i18n key "trait.flourish.text" missing from i18n/en.json']);
  });

  it('flags an empty string value', () => {
    const root = writeFixture({
      i18n: { 'trait.flourish.name': 'Flourish', 'trait.flourish.text': '   ' },
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
    });
    expect(i18nCheck(loadDataset(root)).map((i) => i.message))
      .toEqual(['text: i18n key "trait.flourish.text" is empty in i18n/en.json']);
  });

  it('flags orphan keys in en.json', () => {
    const root = writeFixture({
      i18n: { ...traitI18n('flourish', 'Flourish', 'x'), 'trait.gone.name': 'Gone' },
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
    });
    expect(i18nCheck(loadDataset(root)).map((i) => `${i.file}: ${i.message}`))
      .toEqual(['i18n/en.json: orphan key "trait.gone.name" is not referenced by any record']);
  });

  it('treats nested keys such as prerequisite text as references', () => {
    const root = writeFixture({
      i18n: { 'feat.x.name': 'X', 'feat.x.text': 'T', 'feat.x.prereq.0': 'Must be tall.' },
      records: [{ folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { prerequisites: [{ kind: 'text', key: 'feat.x.prereq.0' }] }) }],
    });
    expect(i18nCheck(loadDataset(root))).toEqual([]);
  });

  it('passes for a record with no "text" field at all', () => {
    const root = writeFixture({
      i18n: { 'trait.flourish.name': 'Flourish' },
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish', { text: undefined }) }],
    });
    expect(i18nCheck(loadDataset(root))).toEqual([]);
  });

  it("flags a text key that points at another record's key", () => {
    const root = writeFixture({
      i18n: { 'trait.flourish.name': 'Flourish', 'trait.fortune.text': 'Fortune text.' },
      records: [
        { folder: 'traits', file: 'trait.flourish.json', json: trait('flourish', { text: 'trait.fortune.text' }) },
        { folder: 'traits', file: 'trait.fortune.json', json: trait('fortune') },
      ],
    });
    const msgs = i18nCheck(loadDataset(root))
      .filter((i) => i.file === 'data/traits/trait.flourish.json')
      .map((i) => i.message);
    expect(msgs).toEqual(['text must be "trait.flourish.text"']);
  });
});
