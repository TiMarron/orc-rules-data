import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFixture, trait, traitI18n, cleanupFixtures } from './helpers.js';
import { buildHashFile } from '../src/reserved/normalize.js';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const TSX_CLI = join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function runCli(args: string[]) {
  return spawnSync(process.execPath, [TSX_CLI, 'validator/src/index.ts', ...args], { cwd: REPO, encoding: 'utf8' });
}

function runOnFixture(root: string) {
  cpSync(join(REPO, 'schema'), join(root, 'schema'), { recursive: true });
  return runCli(['--root', root]);
}

afterAll(cleanupFixtures);

describe('validator CLI', () => {
  it('exits 0 on a valid dataset', () => {
    const root = writeFixture({
      i18n: traitI18n('flourish', 'Flourish', 'One per turn.'),
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
      extra: { 'reserved/terms.sha256': buildHashFile(['Examplia']) },
    });
    const res = runOnFixture(root);
    expect(res.stdout).toContain('0 error(s), 0 warning(s)');
    expect(res.status).toBe(0);
  }, 30000);

  it('exits 1 when there are errors', () => {
    const root = writeFixture({ records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }] });
    const res = runOnFixture(root);
    expect(res.stdout).toContain('missing from i18n/en.json');
    expect(res.status).toBe(1);
  }, 30000);

  it('exits 2 on unreadable input', () => {
    const root = writeFixture({ extra: { 'data/traits/trait.bad.json': '{' } });
    const res = runOnFixture(root);
    expect(res.stderr).toContain('invalid JSON');
    expect(res.status).toBe(2);
  }, 30000);

  it('exits 2 with a usage message when --root has no value', () => {
    const res = runCli(['--root']);
    expect(res.stderr).toContain('usage:');
    expect(res.status).toBe(2);
  }, 30000);
});
