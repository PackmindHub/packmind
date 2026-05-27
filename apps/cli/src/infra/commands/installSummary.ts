import {
  ArtifactCapability,
  CodingAgent,
  capableAgentsFor,
  hasCapableAgent,
} from '@packmind/types';
import { IInstallResult } from '../../domain/useCases/IInstallUseCase';
import { formatCommand } from '../utils/consoleLogger';

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}

function nounFor(
  type: 'skill' | 'command' | 'standard' | 'recipe',
  count: number,
): string {
  return `${count} ${pluralize(type, count)}`;
}

function changedParts(result: IInstallResult): string[] {
  const parts: string[] = [];
  if (result.standardsChanged > 0)
    parts.push(nounFor('standard', result.standardsChanged));
  if (result.commandsChanged > 0)
    parts.push(nounFor('command', result.commandsChanged));
  if (result.skillsChanged > 0)
    parts.push(nounFor('skill', result.skillsChanged));
  return parts;
}

export function buildInstallSummary(result: IInstallResult): string {
  // "Did any artifact actually change on disk?" — driven by the per-artifact
  // change tracker so we don't flip to "Synced …" when only an unrelated
  // agent-index file (CLAUDE.md, AGENTS.md, …) was rewritten.
  const contentChanged =
    result.skillsChanged > 0 ||
    result.standardsChanged > 0 ||
    result.commandsChanged > 0;
  const filesDeleted = result.filesDeleted > 0;
  const configCreated = result.configCreated;
  const packagesAdded = result.packagesAdded.length > 0;

  const nothingHappened =
    !configCreated && !packagesAdded && !contentChanged && !filesDeleted;

  if (nothingHappened) {
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
    const changed = changedParts(result);
    if (changed.length > 0) {
      lines.push(`✅ Synced ${changed.join(', ')}`);
    }
  }

  if (filesDeleted && !contentChanged) {
    lines.push(
      `✅ Removed ${result.filesDeleted} ${pluralize('file', result.filesDeleted)}`,
    );
  }

  return lines.join('\n');
}

const ARTIFACT_TYPES: ReadonlyArray<{
  capability: ArtifactCapability;
  noun: 'skill' | 'standard' | 'command' | 'recipe';
  countKey: 'skillsCount' | 'standardsCount' | 'commandsCount' | 'recipesCount';
}> = [
  { capability: 'skills', noun: 'skill', countKey: 'skillsCount' },
  { capability: 'commands', noun: 'command', countKey: 'commandsCount' },
  { capability: 'standards', noun: 'standard', countKey: 'standardsCount' },
  { capability: 'recipes', noun: 'recipe', countKey: 'recipesCount' },
];

function formatCapableList(agents: CodingAgent[]): string {
  const head = agents.slice(0, 4).join(', ');
  return agents.length > 4 ? `${head}, ...` : head;
}

export function buildIncapableArtifactsWarning(
  result: IInstallResult,
): string | null {
  const mismatches: {
    capability: ArtifactCapability;
    noun: string;
    count: number;
    capable: CodingAgent[];
  }[] = [];

  for (const { capability, noun, countKey } of ARTIFACT_TYPES) {
    const count = result.sourceArtifacts[countKey];
    if (count === 0) continue;
    if (hasCapableAgent(result.resolvedAgents, capability)) continue;
    mismatches.push({
      capability,
      noun,
      count,
      capable: capableAgentsFor(capability),
    });
  }

  if (mismatches.length === 0) return null;

  const agentsLabel =
    result.resolvedAgents.length > 0
      ? result.resolvedAgents.join(', ')
      : '(default)';

  const lines = [
    `⚠️  Some artifacts could not be rendered because your configured agents don't support them:`,
    `   Configured agents: ${agentsLabel}`,
    ...mismatches.map(
      ({ noun, count, capable }) =>
        `   - ${count} ${pluralize(noun, count)}: try ${formatCapableList(capable)}`,
    ),
    `   Run ${formatCommand('packmind-cli config agents')} to add a capable agent.`,
  ];

  return lines.join('\n');
}
