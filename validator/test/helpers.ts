import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_DIR = fileURLToPath(new URL('../../schema/', import.meta.url));

const fixtureRoots: string[] = [];

/** Removes every fixture directory created by writeFixture() so far. Call from afterAll(). */
export function cleanupFixtures(): void {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
}

export interface FixtureRecord {
  folder: string;
  file: string;
  json: unknown;
}

export interface Fixture {
  books?: unknown;
  i18n?: Record<string, string>;
  records?: FixtureRecord[];
  /** extra files: relative path -> content */
  extra?: Record<string, string>;
}

export const DEFAULT_BOOKS = [
  { id: 'gm-core', title: 'GM Core', pages: 336, revisions: ['2023-first', '2026-spring'] },
];

export function writeFixture(fx: Fixture): string {
  const root = mkdtempSync(join(tmpdir(), 'orc-fixture-'));
  fixtureRoots.push(root);
  writeFileSync(join(root, 'books.json'), JSON.stringify(fx.books ?? DEFAULT_BOOKS));
  mkdirSync(join(root, 'i18n'));
  writeFileSync(join(root, 'i18n', 'en.json'), JSON.stringify(fx.i18n ?? {}));
  for (const r of fx.records ?? []) {
    mkdirSync(join(root, 'data', r.folder), { recursive: true });
    writeFileSync(join(root, 'data', r.folder, r.file), JSON.stringify(r.json));
  }
  for (const [rel, content] of Object.entries(fx.extra ?? {})) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

/** A minimal valid envelope for any record type. */
export function record(type: string, slug: string, over: Record<string, unknown> = {}) {
  const id = `${type}.${slug}`;
  return {
    id,
    type,
    name: `${id}.name`,
    text: `${id}.text`,
    traits: [],
    rarity: 'common',
    source: { book: 'gm-core', page: 329, revision: '2026-spring' },
    review: 'human',
    edited: false,
    ...over,
  };
}

export function trait(slug: string, over: Record<string, unknown> = {}) {
  return record('trait', slug, over);
}

export function traitI18n(slug: string, name: string, text: string): Record<string, string> {
  return { [`trait.${slug}.name`]: name, [`trait.${slug}.text`]: text };
}
