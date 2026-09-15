import { loadDataset } from './load.js';
import { formatIssues, runChecks } from './run.js';

const args = process.argv.slice(2);
const rootFlag = args.indexOf('--root');

if (rootFlag >= 0 && args[rootFlag + 1] === undefined) {
  console.error('usage: validate [--root <dir>]');
  process.exitCode = 2;
} else {
  const root = rootFlag >= 0 ? args[rootFlag + 1] : process.cwd();
  try {
    const issues = runChecks(loadDataset(root));
    console.log(formatIssues(issues));
    process.exitCode = issues.some((i) => i.level === 'error') ? 1 : 0;
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 2;
  }
}
