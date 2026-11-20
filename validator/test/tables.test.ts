import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { tablesCheck } from '../src/checks/tables.js';
import { writeFixture, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

const messages = (over: Record<string, unknown>): string[] =>
  tablesCheck(loadDataset(writeFixture({ records: [{ folder: 'tables', file: 'table.t.json', json: record('table', 't', { text: undefined, ...over }) }] }))).map((i) => i.message);

const ADJUSTMENTS = [
  { difficulty: 'incredibly-easy', adjustment: -10 }, { difficulty: 'very-easy', adjustment: -5 }, { difficulty: 'easy', adjustment: -2 },
  { difficulty: 'hard', adjustment: 2, rarity: 'uncommon' }, { difficulty: 'very-hard', adjustment: 5, rarity: 'rare' }, { difficulty: 'incredibly-hard', adjustment: 10, rarity: 'unique' },
];

describe('tables check', () => {
  it('accepts levels and ranks counting up with DCs that never fall', () => {
    expect(messages({ kind: 'dc-by-level', rows: [{ level: 0, dc: 14 }, { level: 1, dc: 15 }, { level: 2, dc: 16 }], ranks: [{ rank: 1, dc: 15 }, { rank: 2, dc: 18 }] })).toEqual([]);
  });

  it('rejects a gap in the levels, a repeated rank and a DC lower than the one before', () => {
    expect(messages({ kind: 'dc-by-level', rows: [{ level: 0, dc: 14 }, { level: 2, dc: 16 }], ranks: [{ rank: 1, dc: 15 }] })).toEqual(['rows[1]: level 2 does not follow 0']);
    expect(messages({ kind: 'dc-by-level', rows: [{ level: 0, dc: 14 }], ranks: [{ rank: 1, dc: 15 }, { rank: 1, dc: 15 }] })).toEqual(['ranks[1]: rank 1 does not follow 1']);
    expect(messages({ kind: 'dc-by-level', rows: [{ level: 0, dc: 14 }, { level: 1, dc: 13 }], ranks: [{ rank: 1, dc: 15 }] })).toEqual(['rows[1]: DC 13 is lower than the DC 14 before it']);
  });

  it('accepts the adjustments in the book order with one rarity per row', () => {
    expect(messages({ kind: 'dc-adjustment', rows: ADJUSTMENTS })).toEqual([]);
  });

  it('rejects adjustments out of order, a falling adjustment and a rarity on two rows', () => {
    expect(messages({ kind: 'dc-adjustment', rows: [ADJUSTMENTS[1], ADJUSTMENTS[0]] })).toEqual([
      'rows: difficulty must appear once each in the book\'s order (incredibly-easy, very-easy, easy, hard, very-hard, incredibly-hard), found very-easy, incredibly-easy',
      'rows[1]: adjustment -10 must be greater than the -5 before it',
    ]);
    expect(messages({ kind: 'dc-adjustment', rows: [ADJUSTMENTS[3], { ...ADJUSTMENTS[4], rarity: 'uncommon' }] })).toEqual(['rows: a rarity stands on more than one row']);
  });

  it('accepts the simple DCs rising with the rank and rejects a repeated rank', () => {
    expect(messages({ kind: 'simple-dc', rows: [{ proficiency: 'untrained', dc: 10 }, { proficiency: 'trained', dc: 15 }] })).toEqual([]);
    expect(messages({ kind: 'simple-dc', rows: [{ proficiency: 'trained', dc: 15 }, { proficiency: 'trained', dc: 20 }] })).toEqual([
      'rows: proficiency must appear once each in the book\'s order (untrained, trained, expert, master, legendary), found trained, trained',
    ]);
  });
});
