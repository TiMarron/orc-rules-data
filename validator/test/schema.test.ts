import { describe, it, expect, afterAll } from 'vitest';
import { join } from 'node:path';
import { loadDataset } from '../src/load.js';
import { makeSchemaCheck } from '../src/checks/schema.js';
import { SCHEMA_DIR, writeFixture, trait, cleanupFixtures } from './helpers.js';

const check = makeSchemaCheck(SCHEMA_DIR);

function issuesFor(json: unknown, folder = 'traits', file = 'trait.flourish.json') {
  return check(loadDataset(writeFixture({ records: [{ folder, file, json }] })));
}

afterAll(cleanupFixtures);

describe('schema check', () => {
  it('accepts a minimal valid trait', () => {
    expect(issuesFor(trait('flourish'))).toEqual([]);
  });

  it('rejects an unknown property', () => {
    const issues = issuesFor(trait('flourish', { bogus: 1 }));
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe('error');
    expect(issues[0].message).toContain('must NOT have unevaluated properties (bogus)');
  });

  it('rejects a malformed i18n key in name', () => {
    const issues = issuesFor(trait('flourish', { name: 'Flourish' }));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/\/name must match pattern/);
  });

  it('rejects a source without a page', () => {
    const issues = issuesFor(
      trait('flourish', { source: { book: 'gm-core', revision: '2026-spring' } }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("must have required property 'page'");
  });

  it('reports an unknown data folder', () => {
    const issues = issuesFor(trait('flourish'), 'widgets', 'trait.flourish.json');
    expect(issues[0].message).toBe('unknown data folder "widgets"');
  });

  it('names the schema file when ajv.addSchema itself throws', () => {
    const root = writeFixture({
      extra: {
        'schema/broken.schema.json': JSON.stringify({
          $id: 'broken.schema.json',
          type: 'object',
          properties: { a: { type: 'nonsense' } },
        }),
      },
    });
    expect(() => makeSchemaCheck(join(root, 'schema'))).toThrow(/broken\.schema\.json: /);
  });

  it('fails fast on a schema that does not compile', () => {
    const root = writeFixture({
      extra: {
        'schema/broken.schema.json': JSON.stringify({
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          $id: 'broken.schema.json',
          type: 'object',
          unevaluatedProperties: false,
          required: ['x'],
        }),
      },
    });
    expect(() => makeSchemaCheck(join(root, 'schema'))).toThrow();
  });
});
