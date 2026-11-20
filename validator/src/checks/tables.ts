import type { Check, Issue } from '../types.js';

type Obj = Record<string, unknown>;
const list = (value: unknown): Obj[] =>
  Array.isArray(value) ? value.filter((v): v is Obj => v !== null && typeof v === 'object') : [];

const DIFFICULTIES = ['incredibly-easy', 'very-easy', 'easy', 'hard', 'very-hard', 'incredibly-hard'];
const PROFICIENCIES = ['untrained', 'trained', 'expert', 'master', 'legendary'];

/**
 * What JSON Schema cannot say about a `table`: its rows stand in print order without gaps, each key
 * once — levels and ranks counting up by one from the first, the difficulties and proficiency ranks
 * in the book's order — a DC never falls as the level or rank rises, an adjustment never falls as the
 * difficulty rises, and a rarity stands on one row only.
 */
export const tablesCheck: Check = (ds) => {
  const issues: Issue[] = [];
  for (const f of ds.files) {
    if (f.record.type !== 'table') continue;
    const error = (message: string): void => { issues.push({ level: 'error', file: f.path, message }); };
    const counted = (rows: Obj[], key: string, field: string): void => {
      rows.forEach((row, i) => {
        if (i === 0) return;
        const prev = rows[i - 1];
        if (typeof row[key] === 'number' && typeof prev[key] === 'number' && row[key] !== (prev[key] as number) + 1) {
          error(`${field}[${i}]: ${key} ${String(row[key])} does not follow ${String(prev[key])}`);
        }
        if (typeof row.dc === 'number' && typeof prev.dc === 'number' && row.dc < prev.dc) {
          error(`${field}[${i}]: DC ${row.dc} is lower than the DC ${prev.dc} before it`);
        }
      });
    };
    const ordered = (rows: Obj[], key: string, order: string[]): void => {
      const keys = rows.map((r) => String(r[key]));
      const expected = order.filter((k) => keys.includes(k));
      if (keys.join() !== expected.join() || new Set(keys).size !== keys.length) {
        error(`rows: ${key} must appear once each in the book's order (${order.join(', ')}), found ${keys.join(', ')}`);
      }
    };
    const rows = list(f.record.rows);
    switch (f.record.kind) {
      case 'dc-by-level':
        counted(rows, 'level', 'rows');
        counted(list(f.record.ranks), 'rank', 'ranks');
        break;
      case 'dc-adjustment': {
        ordered(rows, 'difficulty', DIFFICULTIES);
        rows.forEach((row, i) => {
          const prev = rows[i - 1];
          if (prev && typeof row.adjustment === 'number' && typeof prev.adjustment === 'number' && row.adjustment <= prev.adjustment) {
            error(`rows[${i}]: adjustment ${row.adjustment} must be greater than the ${prev.adjustment} before it`);
          }
        });
        const rarities = rows.map((r) => r.rarity).filter((r) => r !== undefined);
        if (new Set(rarities).size !== rarities.length) error(`rows: a rarity stands on more than one row`);
        break;
      }
      case 'simple-dc':
        ordered(rows, 'proficiency', PROFICIENCIES);
        rows.forEach((row, i) => {
          const prev = rows[i - 1];
          if (prev && typeof row.dc === 'number' && typeof prev.dc === 'number' && row.dc <= prev.dc) {
            error(`rows[${i}]: DC ${row.dc} must be greater than the DC ${prev.dc} before it`);
          }
        });
        break;
    }
  }
  return issues;
};
