import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { scalesCheck } from '../src/checks/scales.js';
import { writeFixture, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

const LEVELS = Array.from({ length: 26 }, (_, i) => i - 1); // −1 … 24
const row = (level: number, over: Record<string, unknown> = {}) => ({ level, moderate: 5, ...over });

const scale = (slug: string, rows: unknown[], over: Record<string, unknown> = {}) => ({
  folder: 'scales', file: `scale.${slug}.json`,
  json: record('scale', slug, { text: undefined, ...over, rows }),
});

const withTiers = { tiers: ['extreme', 'high', 'moderate', 'low'] };

const messages = (records: { folder: string; file: string; json: unknown }[]): string[] =>
  scalesCheck(loadDataset(writeFixture({ records }))).map((i) => i.message);

describe('scales check', () => {
  it('accepts a table with every level −1 … 24 and only its own tiers in each row', () => {
    expect(messages([scale('spell-dc', LEVELS.map((l) => row(l)), withTiers)])).toEqual([]);
  });

  it('rejects a row whose level is missing', () => {
    expect(messages([scale('spell-dc', LEVELS.filter((l) => l !== 7).map((l) => row(l)), withTiers)])).toEqual([
      'rows: level 7 missing',
    ]);
    expect(messages([scale('spell-dc', LEVELS.filter((l) => l !== -1 && l !== 24).map((l) => row(l)), withTiers)])).toEqual([
      'rows: level -1 missing',
      'rows: level 24 missing',
    ]);
  });

  it('rejects a cell sitting under a tier the record does not carry', () => {
    expect(messages([scale('spell-dc', LEVELS.map((l) => (l === 0 ? { level: 0, extreme: 19, high: 16, moderate: 13, low: 8 } : row(l))), { tiers: ['extreme', 'high', 'moderate'] })])).toEqual([
      'rows[1]: tier "low" not in tiers',
    ]);
  });

  it('rejects a range cell whose bounds are crossed', () => {
    expect(messages([scale('hp', LEVELS.map((l) => (l === -1 ? { level: -1, moderate: { min: 9, max: 5 } } : row(l))), { tiers: ['high', 'moderate', 'low'] })])).toEqual([
      'rows[0].moderate: min > max',
    ]);
  });

  it('rejects a tier not of the enumeration, wherever it appears', () => {
    expect(messages([scale('spell-dc', LEVELS.map((l) => (l === 0 ? row(0, { insane: 30 }) : row(l))), withTiers)])).toEqual([
      'rows[1]: tier "insane" not in tiers',
    ]);
  });
});
