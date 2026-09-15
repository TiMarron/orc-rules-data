import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { formatIssues, runChecks } from '../src/run.js';
import type { Check } from '../src/types.js';
import { buildHashFile } from '../src/reserved/normalize.js';
import { SCHEMA_DIR, writeFixture, trait, traitI18n, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

describe('runChecks', () => {
  it('returns no errors for a fully valid single-trait dataset', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'One per turn.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
      extra: { 'reserved/terms.sha256': buildHashFile(['Examplia']) },
    });
    const issues = runChecks(loadDataset(root), SCHEMA_DIR);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(issues.map((i) => i.file)).toEqual([]);
  });

  it('collects issues from every check', () => {
    const root = writeFixture({
      records: [{ folder: 'traits', file: 'wrong.json', json: trait('flourish', { bogus: 1, edited: true }) }],
    });
    const messages = runChecks(loadDataset(root), SCHEMA_DIR).map((i) => i.message);
    expect(messages.some((m) => m.startsWith('schema:'))).toBe(true);
    expect(messages.some((m) => m.startsWith('file name must be'))).toBe(true);
    expect(messages.some((m) => m.startsWith('text: i18n key'))).toBe(true);
    expect(messages).toContain('edited is true but editNote is missing');
  });

  it('turns a throwing check into a reported error instead of crashing', () => {
    const root = writeFixture({});
    const boom: Check = function boomCheck() { throw new Error('kaboom'); };
    const issues = runChecks(loadDataset(root), SCHEMA_DIR, [boom]);
    expect(issues).toEqual([{ level: 'error', file: '(validator)', message: 'check "boomCheck" threw: kaboom' }]);
  });
});

describe('formatIssues', () => {
  it('groups by file and ends with a summary line', () => {
    const out = formatIssues([
      { level: 'error', file: 'b.json', message: 'two' },
      { level: 'warning', file: 'a.json', message: 'one' },
      { level: 'error', file: 'b.json', message: 'three' },
    ]);
    expect(out).toBe(['a.json', '  WARNING: one', 'b.json', '  ERROR: two', '  ERROR: three', '2 error(s), 1 warning(s)'].join('\n'));
  });
});
