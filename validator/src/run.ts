import { join } from 'node:path';
import type { Check, Dataset, Issue } from './types.js';
import { makeSchemaCheck } from './checks/schema.js';
import { flagsCheck } from './checks/flags.js';
import { idsCheck } from './checks/ids.js';
import { refsCheck } from './checks/refs.js';
import { i18nCheck } from './checks/i18n.js';
import { sourceCheck } from './checks/source.js';
import { reservedCheck } from './checks/reserved.js';

export function defaultChecks(schemaDir: string): Check[] {
  return [makeSchemaCheck(schemaDir), flagsCheck, idsCheck, refsCheck, i18nCheck, sourceCheck, reservedCheck];
}

export function runChecks(ds: Dataset, schemaDir = join(ds.root, 'schema'), checks = defaultChecks(schemaDir)): Issue[] {
  const issues: Issue[] = [];
  for (const check of checks) {
    try {
      issues.push(...check(ds));
    } catch (e) {
      issues.push({ level: 'error', file: '(validator)', message: `check "${check.name || 'anonymous'}" threw: ${(e as Error).message}` });
    }
  }
  return issues;
}

export function formatIssues(issues: Issue[]): string {
  const byFile = new Map<string, Issue[]>();
  for (const issue of issues) {
    const list = byFile.get(issue.file) ?? [];
    list.push(issue);
    byFile.set(issue.file, list);
  }
  const lines: string[] = [];
  for (const [file, list] of [...byFile.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(file);
    for (const issue of list) lines.push(`  ${issue.level.toUpperCase()}: ${issue.message}`);
  }
  const errors = issues.filter((i) => i.level === 'error').length;
  lines.push(`${errors} error(s), ${issues.length - errors} warning(s)`);
  return lines.join('\n');
}
