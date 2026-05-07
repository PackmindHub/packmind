import { IInstallResult } from '../../domain/useCases/IInstallUseCase';

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}

function nounFor(
  type: 'skill' | 'command' | 'standard' | 'recipe',
  count: number,
): string {
  return `${count} ${pluralize(type, count)}`;
}

function contentParts(result: IInstallResult): string[] {
  const parts: string[] = [];
  if (result.standardsCount > 0)
    parts.push(nounFor('standard', result.standardsCount));
  if (result.commandsCount > 0)
    parts.push(nounFor('command', result.commandsCount));
  if (result.skillsCount > 0) parts.push(nounFor('skill', result.skillsCount));
  if (result.recipesCount > 0)
    parts.push(nounFor('recipe', result.recipesCount));
  return parts;
}

export function buildInstallSummary(result: IInstallResult): string {
  const contentChanged = result.contentFilesChanged > 0;
  const parts = contentParts(result);
  const filesDeleted = result.filesDeleted > 0;
  const configCreated = result.configCreated;
  const packagesAdded = result.packagesAdded.length > 0;

  const nothingHappened =
    !configCreated && !packagesAdded && !contentChanged && !filesDeleted;

  if (nothingHappened) {
    if (parts.length > 0) {
      return `✅ Already up to date — ${parts.join(', ')}`;
    }
    return '✅ Already up to date';
  }

  const lines: string[] = [];

  if (configCreated) {
    const count = result.packagesAdded.length;
    lines.push(
      `✅ Created packmind.json with ${count} ${pluralize('package', count)}`,
    );
  } else if (packagesAdded) {
    const count = result.packagesAdded.length;
    lines.push(
      `✅ Added ${count} ${pluralize('package', count)} to packmind.json`,
    );
  }

  if (packagesAdded) {
    lines.push(...result.packagesAdded.map((s) => `   - ${s}`));
  }

  if (contentChanged) {
    lines.push(`✅ Synced ${parts.join(', ')}`);
  }

  if (filesDeleted && !contentChanged) {
    lines.push(
      `✅ Removed ${result.filesDeleted} ${pluralize('file', result.filesDeleted)}`,
    );
  }

  return lines.join('\n');
}
