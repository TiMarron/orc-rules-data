import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { sourceCheck } from '../src/checks/source.js';
import { writeFixture, trait, cleanupFixtures } from './helpers.js';

const run = (source: unknown) =>
  sourceCheck(loadDataset(writeFixture({ records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish', { source }) }] }))).map((i) => i.message);

afterAll(cleanupFixtures);

describe('source check', () => {
  it('passes a known book, page in range and known revision', () => {
    expect(run({ book: 'gm-core', page: 329, revision: '2026-spring' })).toEqual([]);
  });
  it('flags an unknown book', () => {
    expect(run({ book: 'bestiary', page: 1, revision: '2026-spring' })).toEqual(['source.book "bestiary" is not listed in books.json']);
  });
  it('flags a page outside the book', () => {
    expect(run({ book: 'gm-core', page: 337, revision: '2026-spring' })).toEqual(['source.page 337 is outside 1..336 for gm-core']);
  });
  it('flags an unknown revision', () => {
    expect(run({ book: 'gm-core', page: 1, revision: '2030-x' })).toEqual(['source.revision "2030-x" is not one of 2023-first, 2026-spring for gm-core']);
  });
  it('stays silent when source is missing (schema reports that)', () => {
    expect(run(undefined)).toEqual([]);
  });
});
