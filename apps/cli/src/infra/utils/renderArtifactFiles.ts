import { ArtifactType } from '@packmind/types';
import {
  PackmindLockFile,
  PackmindLockFileEntry,
} from '../../domain/repositories/PackmindLockFile';
import { formatLabel, formatFilePath } from './consoleLogger';

export function findArtifactEntry(
  lockFiles: PackmindLockFile[],
  artifactType: ArtifactType,
  slug: string,
): PackmindLockFileEntry | undefined {
  for (const lockFile of lockFiles) {
    for (const [key, entry] of Object.entries(lockFile.artifacts)) {
      if (entry.type === artifactType && key === slug) {
        return entry;
      }
    }
  }
  return undefined;
}

export function renderArtifactFiles(
  lockFiles: PackmindLockFile[],
  artifactType: ArtifactType,
  slug: string,
  log: typeof console.log,
): void {
  const entry = findArtifactEntry(lockFiles, artifactType, slug);
  if (!entry) {
    return;
  }

  const filesByAgent = new Map<string, string[]>();
  for (const file of entry.files) {
    const existing = filesByAgent.get(file.agent) ?? [];
    existing.push(file.path);
    filesByAgent.set(file.agent, existing);
  }

  const sortedAgents = [...filesByAgent.keys()].sort();

  for (const agent of sortedAgents) {
    const files = filesByAgent.get(agent)!;
    if (files.length === 1) {
      log(`    ${formatLabel(agent.padEnd(10))} ${formatFilePath(files[0])}`);
    } else {
      log(`    ${formatLabel(agent)}`);
      for (const filePath of files) {
        log(`      ${formatFilePath(filePath)}`);
      }
    }
  }
}

export function formatAgentsHeader(lockFiles: PackmindLockFile[]): string {
  const allAgents = new Set<string>();
  for (const lockFile of lockFiles) {
    for (const agent of lockFile.agents) {
      allAgents.add(agent);
    }
  }

  const sorted = [...allAgents].sort();
  if (sorted.length === 0) {
    return '';
  }

  return `  —  Agents: ${sorted.join(', ')}`;
}
