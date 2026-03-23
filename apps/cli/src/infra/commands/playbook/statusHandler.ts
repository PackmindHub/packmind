import * as path from 'path';

import { findNearestConfigDir } from '../../../application/utils/findNearestConfigDir';
import { normalizePath } from '../../../application/utils/pathUtils';
import { formatLabel, logConsole } from '../../utils/consoleLogger';
import { capitalize } from '../../utils/stringUtils';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  IPlaybookLocalRepository,
  PlaybookChangeEntry,
} from '../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../domain/repositories/ILockFileRepository';
import {
  PackmindLockFile,
  PackmindLockFileEntry,
} from '../../../domain/repositories/PackmindLockFile';
import { ArtifactVersionEntry, FileModification } from '@packmind/types';

export type PlaybookStatusHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  playbookLocalRepository: IPlaybookLocalRepository;
  lockFileRepository: ILockFileRepository;
  cwd: string;
  exit: (code: number) => void;
  readFile: (path: string) => string;
};

type UntrackedChange = {
  artifactName: string;
  artifactType: string;
  filePath: string;
  changeType?: string;
};

type GroupedChange = {
  artifactName: string;
  artifactType: string;
  changeType?: string;
  spaceName?: string;
  filePaths: string[];
};

function logGroupedChange(header: string, filePaths: string[]): void {
  if (filePaths.length === 1) {
    logConsole(`  - ${header} ${formatLabel(filePaths[0])}`);
  } else {
    logConsole(`  - ${header}`);
    for (const filePath of filePaths) {
      logConsole(`    ${formatLabel(filePath)}`);
    }
  }
}

function findArtifactForFile(
  filePath: string,
  artifacts: Record<string, PackmindLockFileEntry>,
): PackmindLockFileEntry | undefined {
  const normalized = normalizePath(filePath);
  for (const entry of Object.values(artifacts)) {
    for (const file of entry.files) {
      if (normalizePath(file.path) === normalized) {
        return entry;
      }
    }
  }
  return undefined;
}

function lockFileToArtifactVersionEntries(
  lockFile: PackmindLockFile,
): ArtifactVersionEntry[] {
  return Object.values(lockFile.artifacts).map((entry) => ({
    name: entry.name,
    type: entry.type,
    id: entry.id,
    version: entry.version,
    spaceId: entry.spaceId,
  }));
}

async function fetchDeployedFiles(
  packmindCliHexa: PackmindCliHexa,
  lockFile: PackmindLockFile,
): Promise<FileModification[]> {
  try {
    const artifacts = lockFileToArtifactVersionEntries(lockFile);
    const response = await packmindCliHexa
      .getPackmindGateway()
      .deployment.getContentByVersions({
        artifacts,
        agents: lockFile.agents,
      });
    return response.fileUpdates.createOrUpdate;
  } catch {
    return [];
  }
}

function groupStagedChanges(changes: PlaybookChangeEntry[]): GroupedChange[] {
  const groups = new Map<string, GroupedChange>();
  for (const change of changes) {
    const changeType = change.changeType ?? 'updated';
    const key = `${change.artifactType}:${change.artifactName}:${changeType}`;
    const existing = groups.get(key);
    if (existing) {
      existing.filePaths.push(change.filePath);
    } else {
      groups.set(key, {
        artifactName: change.artifactName,
        artifactType: change.artifactType,
        changeType,
        spaceName: change.spaceName,
        filePaths: [change.filePath],
      });
    }
  }
  return Array.from(groups.values());
}

function groupUntrackedChanges(changes: UntrackedChange[]): GroupedChange[] {
  const groups = new Map<string, GroupedChange>();
  for (const change of changes) {
    const key = `${change.artifactType}:${change.artifactName}:${change.changeType ?? ''}`;
    const existing = groups.get(key);
    if (existing) {
      existing.filePaths.push(change.filePath);
    } else {
      groups.set(key, {
        artifactName: change.artifactName,
        artifactType: change.artifactType,
        changeType: change.changeType,
        filePaths: [change.filePath],
      });
    }
  }
  return Array.from(groups.values());
}

export async function playbookStatusHandler(
  deps: PlaybookStatusHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    playbookLocalRepository,
    lockFileRepository,
    cwd,
    exit,
    readFile,
  } = deps;

  const stagedChanges = playbookLocalRepository.getChanges();
  const stagedPaths = new Set(
    stagedChanges.map((c) => normalizePath(c.filePath)),
  );
  const stagedSkillDirPaths = stagedChanges
    .filter((c) => c.artifactType === 'skill')
    .map((c) => normalizePath(c.filePath));

  const untrackedChanges: UntrackedChange[] = [];

  const projectDir = await findNearestConfigDir(cwd, packmindCliHexa);
  if (projectDir) {
    const lockFile = await lockFileRepository.read(projectDir);

    if (lockFile && Object.keys(lockFile.artifacts).length > 0) {
      const deployedFiles = await fetchDeployedFiles(packmindCliHexa, lockFile);

      for (const deployedFile of deployedFiles) {
        const normalizedDeployedPath = normalizePath(deployedFile.path);

        if (
          stagedPaths.has(normalizedDeployedPath) ||
          stagedSkillDirPaths.some((staged) =>
            normalizedDeployedPath.startsWith(staged + '/'),
          )
        ) {
          continue;
        }

        let localContent: string;
        try {
          localContent = readFile(path.join(projectDir, deployedFile.path));
        } catch {
          const artifact = findArtifactForFile(
            deployedFile.path,
            lockFile.artifacts,
          );
          if (artifact) {
            untrackedChanges.push({
              artifactName: artifact.name,
              artifactType: artifact.type,
              filePath: deployedFile.path,
              changeType: 'deleted',
            });
          }
          continue;
        }

        if (
          deployedFile.content &&
          localContent.trim() !== deployedFile.content.trim()
        ) {
          const artifact = findArtifactForFile(
            deployedFile.path,
            lockFile.artifacts,
          );
          if (artifact) {
            untrackedChanges.push({
              artifactName: artifact.name,
              artifactType: artifact.type,
              filePath: deployedFile.path,
            });
          }
        }
      }
    }
  }

  const groupedStaged = groupStagedChanges(stagedChanges);
  const groupedUntracked = groupUntrackedChanges(untrackedChanges);

  if (groupedStaged.length > 0) {
    logConsole('Changes to be submitted:');
    for (const group of groupedStaged) {
      const spaceInfo = group.spaceName ? ` in space "${group.spaceName}"` : '';
      logGroupedChange(
        `${capitalize(group.artifactType)} "${group.artifactName}" (${group.changeType})${spaceInfo}`,
        group.filePaths,
      );
    }
    logConsole('');
    logConsole('Use `packmind playbook submit` to send them');
  }

  if (groupedUntracked.length > 0) {
    if (groupedStaged.length > 0) {
      logConsole('');
    }
    logConsole('Changes not tracked:');
    for (const group of groupedUntracked) {
      const changeInfo = group.changeType ? ` (${group.changeType})` : '';
      logGroupedChange(
        `${capitalize(group.artifactType)} "${group.artifactName}"${changeInfo}`,
        group.filePaths,
      );
    }
    logConsole('');
    logConsole('Use `packmind playbook add <path>` to track them');
  }

  if (groupedStaged.length === 0 && groupedUntracked.length === 0) {
    logConsole('No changes detected.');
  }

  exit(0);
}
