import Ajv2020 from 'ajv/dist/2020.js';
import type { Ajv2020 as AjvType } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Check, Issue } from '../types.js';
import { TYPE_FOLDERS } from '../types.js';

const AjvCtor = (Ajv2020 as unknown as { default?: new (opts?: unknown) => AjvType }).default ??
  (Ajv2020 as unknown as new (opts?: unknown) => AjvType);
const addFormatsFn = (addFormats as unknown as { default?: (ajv: AjvType) => void }).default ??
  (addFormats as unknown as (ajv: AjvType) => void);

const FOLDER_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_FOLDERS).map(([type, folder]) => [folder, type]),
);

export function loadSchemas(schemaDir: string): AjvType {
  const ajv = new AjvCtor({ allErrors: true, strict: true });
  addFormatsFn(ajv);
  const names: string[] = [];
  for (const name of readdirSync(schemaDir).sort()) {
    if (!name.endsWith('.schema.json')) continue;
    const raw = readFileSync(join(schemaDir, name), 'utf8');
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      throw new Error(`schema/${name}: invalid JSON (${(e as Error).message})`);
    }
    if (parsed.$id !== name) {
      throw new Error(`${name}: $id must equal the file name, found "${String(parsed.$id)}"`);
    }
    try {
      ajv.addSchema(parsed);
    } catch (e) {
      throw new Error(`schema/${name}: ${(e as Error).message}`);
    }
    names.push(name);
  }
  // ajv compiles schemas lazily; force eager compilation so strict-mode
  // errors surface here rather than on the first record of that type.
  for (const name of names) {
    if (!ajv.getSchema(name)) {
      throw new Error(`${name}: schema failed to compile`);
    }
  }
  return ajv;
}

export function makeSchemaCheck(schemaDir: string): Check {
  const ajv = loadSchemas(schemaDir);
  const schemaCheck: Check = (ds) => {
    const issues: Issue[] = [];
    for (const f of ds.files) {
      const type = FOLDER_TYPES[f.folder];
      if (!type) {
        issues.push({ level: 'error', file: f.path, message: `unknown data folder "${f.folder}"` });
        continue;
      }
      const validate = ajv.getSchema(`${type}.schema.json`);
      if (!validate) {
        issues.push({ level: 'error', file: f.path, message: `no schema for type "${type}"` });
        continue;
      }
      if (!validate(f.record)) {
        for (const err of validate.errors ?? []) {
          let message = `schema: ${err.instancePath || '/'} ${err.message ?? ''}`.trim();
          const params = err.params as Record<string, unknown> | undefined;
          const badProp =
            typeof params?.unevaluatedProperty === 'string'
              ? params.unevaluatedProperty
              : typeof params?.additionalProperty === 'string'
                ? params.additionalProperty
                : undefined;
          if (badProp !== undefined) message += ` (${badProp})`;
          issues.push({ level: 'error', file: f.path, message });
        }
      }
    }
    return issues;
  };
  return schemaCheck;
}
