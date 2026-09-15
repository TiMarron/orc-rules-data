import { readFileSync, writeFileSync } from 'node:fs';
import { buildHashFile } from '../../validator/src/reserved/normalize.js';

const [input = 'reserved/terms.local.txt', output = 'reserved/terms.sha256'] = process.argv.slice(2);
const terms = readFileSync(input, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));
const file = buildHashFile(terms);
writeFileSync(output, file);
console.log(`${terms.length} term(s) -> ${file.split('\n').length - 2} hash(es) -> ${output}`);
