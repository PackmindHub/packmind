import { diffLines } from 'diff';
import chalk from 'chalk';

export type DiffResult = {
  lines: string[];
  hasChanges: boolean;
};

export function formatContentDiff(
  oldContent: string,
  newContent: string,
): DiffResult {
  const changes = diffLines(oldContent, newContent);
  const lines: string[] = [];

  for (const change of changes) {
    const trimmedValue = change.value.replace(/\n$/, '');
    const changeLines = trimmedValue.split('\n');

    if (change.added) {
      for (const line of changeLines) {
        lines.push(chalk.green(`    + ${line}`));
      }
    } else if (change.removed) {
      for (const line of changeLines) {
        lines.push(chalk.red(`    - ${line}`));
      }
    }
  }

  return {
    lines,
    hasChanges: lines.length > 0,
  };
}
