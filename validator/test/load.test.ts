import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { writeFixture, trait, traitI18n, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

describe('loadDataset', () => {
  it('loads books, i18n and records with relative paths', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'Only one per turn.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
    });
    const ds = loadDataset(root);
    expect(ds.books.map((b) => b.id)).toEqual(['gm-core']);
    expect(ds.i18n['trait.flourish.name']).toBe('Flourish');
    expect(ds.files).toHaveLength(1);
    expect(ds.files[0].path).toBe('data/traits/trait.flourish.json');
    expect(ds.files[0].folder).toBe('traits');
    expect(ds.byId.get('trait.flourish')?.record.type).toBe('trait');
  });

  it('throws a message naming the file on invalid JSON', () => {
    const root = writeFixture({ extra: { 'data/traits/trait.bad.json': '{ not json' } });
    expect(() => loadDataset(root)).toThrow(/data\/traits\/trait\.bad\.json: invalid JSON/);
  });

  it('works with no data directory at all', () => {
    const root = writeFixture({});
    expect(loadDataset(root).files).toEqual([]);
  });

  it('names the file when books.json is invalid JSON', () => {
    const root = writeFixture({});
    writeFileSync(join(root, 'books.json'), '{ nope');
    expect(() => loadDataset(root)).toThrow(/books\.json: invalid JSON/);
  });

  it('tolerates a missing i18n/en.json when there are no records', () => {
    const root = writeFixture({});
    rmSync(join(root, 'i18n', 'en.json'));
    expect(loadDataset(root).i18n).toEqual({});
  });

  it('throws when i18n/en.json is missing but data/ has records', () => {
    const root = writeFixture({
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
    });
    rmSync(join(root, 'i18n', 'en.json'));
    expect(() => loadDataset(root)).toThrow(/i18n\/en\.json is missing but data\/ is not empty/);
  });

  it('names the file when a record is not an object', () => {
    const root = writeFixture({ extra: { 'data/traits/trait.null.json': 'null' } });
    expect(() => loadDataset(root)).toThrow(/data\/traits\/trait\.null\.json: expected a JSON object/);
  });

  it('throws when a books.json entry is missing revisions', () => {
    const root = writeFixture({ books: [{ id: 'gm-core', title: 'GM Core', pages: 336 }] });
    expect(() => loadDataset(root)).toThrow(/books\.json: entry 0 is malformed \(missing revisions\)/);
  });

  it('throws when books.json is not an array', () => {
    const root = writeFixture({ books: {} });
    expect(() => loadDataset(root)).toThrow(/books\.json: .*not an array/);
  });
});
