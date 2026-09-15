import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { reservedCheck } from '../src/checks/reserved.js';
import { MAX_TERM_WORDS, buildHashFile, hashTerm, ngrams, normalizeTerm, parseHashFile } from '../src/reserved/normalize.js';
import { writeFixture, trait, traitI18n, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

describe('normalize', () => {
  it('lowercases, strips possessives and punctuation, collapses spaces', () => {
    expect(normalizeTerm("  Examplia's   Vorn-Hollow, Inc. ")).toBe('examplia vorn hollow inc');
    expect(normalizeTerm('Examplia’s')).toBe('examplia');
  });
  it('folds diacritics before lowercasing instead of dropping the letter', () => {
    expect(normalizeTerm('Café')).toBe('cafe');
  });
  it('strips one trailing s from words longer than 3 chars, but not from words ending in ss', () => {
    expect(normalizeTerm('The Vorns of Examplia-Hollows')).toBe('the vorn of examplia hollow');
    expect(normalizeTerm('Boss')).toBe('boss');
  });
  it('builds 1..MAX_TERM_WORDS-grams by default', () => {
    expect(ngrams('a b c d')).toEqual([
      'a', 'b', 'c', 'd',
      'a b', 'b c', 'c d',
      'a b c', 'b c d',
      'a b c d',
    ]);
  });
  it('hashes the normalized form, so casing does not matter', () => {
    expect(hashTerm('Examplia')).toBe(hashTerm('examplia'));
    expect(hashTerm('Examplia')).toMatch(/^[0-9a-f]{64}$/);
  });
  it('round-trips through the hash file format, ignoring comments', () => {
    const file = buildHashFile(['Examplia', 'Vorn Hollow', 'examplia']);
    expect(file.startsWith('# ')).toBe(true);
    expect(parseHashFile(file)).toEqual(new Set([hashTerm('examplia'), hashTerm('vorn hollow')]));
  });
  it('rejects a reserved term with more words than can ever be matched', () => {
    expect(() => buildHashFile(['one two three four five'])).toThrow(
      `reserved term "one two three four five" has more than ${MAX_TERM_WORDS} words and can never be matched`,
    );
  });
  it('rejects a hash file line that is not a sha256 hash', () => {
    expect(() => parseHashFile('# comment\nnothash\n')).toThrow(
      'reserved/terms.sha256: line 2 is not a sha256 hash',
    );
  });
});

describe('reserved check', () => {
  const hashes = buildHashFile(['Examplia', 'Vorn Hollow']);

  it('flags a single-word and a multi-word reserved term in en.json', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'Popular in Examplia and in Vorn Hollow.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
      extra: { 'reserved/terms.sha256': hashes },
    });
    expect(reservedCheck(loadDataset(root)).map((i) => i.message).sort()).toEqual([
      'trait.flourish.text: reserved term "examplia"',
      'trait.flourish.text: reserved term "vorn hollow"',
    ]);
  });

  it('flags reserved terms inside editNote', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'Clean.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish', { edited: true, editNote: 'Removed mention of Examplia' }) }],
      extra: { 'reserved/terms.sha256': hashes },
    });
    expect(reservedCheck(loadDataset(root)).map((i) => `${i.file}: ${i.message}`))
      .toEqual(['data/traits/trait.flourish.json: editNote: reserved term "examplia"']);
  });

  it('honours the allowlist', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'Popular in Examplia.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
      extra: {
        'reserved/terms.sha256': hashes,
        'reserved/allowlist.json': JSON.stringify([{ term: 'Examplia', reason: 'generic word in this context' }]),
      },
    });
    expect(reservedCheck(loadDataset(root))).toEqual([]);
  });

  it('throws when the allowlist is not valid JSON, so it surfaces as a fatal error', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'Popular in Examplia.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
      extra: {
        'reserved/terms.sha256': hashes,
        'reserved/allowlist.json': '{',
      },
    });
    expect(() => reservedCheck(loadDataset(root))).toThrow(/allowlist\.json: invalid JSON/);
  });

  it('flags both a single-word and a multi-word reserved term in one pass over the same text', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'EXAMPLIA! And vorn-hollow.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
      extra: { 'reserved/terms.sha256': hashes },
    });
    expect(reservedCheck(loadDataset(root)).map((i) => i.message).sort()).toEqual([
      'trait.flourish.text: reserved term "examplia"',
      'trait.flourish.text: reserved term "vorn hollow"',
    ]);
  });

  it('throws when the hash file is missing, so the scan cannot be silently skipped', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'Popular in Examplia.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
    });
    expect(() => reservedCheck(loadDataset(root))).toThrow(/terms\.sha256 is missing/);
  });

  it('throws when an allowlist entry has no reason', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'Popular in Examplia.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
      extra: {
        'reserved/terms.sha256': hashes,
        'reserved/allowlist.json': JSON.stringify([{ term: 'Examplia', reason: '' }]),
      },
    });
    expect(() => reservedCheck(loadDataset(root))).toThrow(
      'reserved/allowlist.json: entry 0 needs a non-empty "reason"',
    );
  });

  it('flags a reserved term in the id, in i18n keys stored on the record, and in the file path', () => {
    const root = writeFixture({
      i18n: traitI18n('examplia', 'Something Clean', 'Something clean.'),
      records: [{ folder: 'traits', file: 'trait.examplia.json', json: trait('examplia') }],
      extra: { 'reserved/terms.sha256': hashes },
    });
    const messages = reservedCheck(loadDataset(root)).map((i) => i.message);
    expect(messages).toContain('id: reserved term "examplia"');
    expect(messages).toContain('name: reserved term "examplia"');
    expect(messages).toContain('text: reserved term "examplia"');
    expect(messages).toContain('path: reserved term "examplia"');
  });

  it('flags a reserved term inside a non-i18n string field such as usage', () => {
    const root = writeFixture({
      records: [{ folder: 'items', file: 'item.x.json', json: record('item', 'x', { usage: 'made in Examplia' }) }],
      extra: { 'reserved/terms.sha256': hashes },
    });
    const messages = reservedCheck(loadDataset(root)).map((i) => i.message);
    expect(messages).toContain('usage: reserved term "examplia"');
  });
});
