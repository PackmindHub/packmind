import * as path from 'path';

import { findNearestConfigDir } from '../../application/utils/findNearestConfigDir';
import { normalizePath } from '../../application/utils/pathUtils';
import { formatLabel, logConsole } from '../utils/consoleLogger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import {
  PackmindLockFile,
  PackmindLockFileEntry,
} from '../../domain/repositories/PackmindLockFile';
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
  codingAgent: string;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function findArtifactForFile(
  filePath: string,
  artifacts: Record<string, PackmindLockFileEntry>,
): { entry: PackmindLockFileEntry; agent: string } | undefined {
  const normalized = normalizePath(filePath);
  for (const entry of Object.values(artifacts)) {
    for (const file of entry.files) {
      if (normalizePath(file.path) === normalized) {
        return { entry, agent: file.agent };
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

  const untrackedChanges: UntrackedChange[] = [];

  const projectDir = await findNearestConfigDir(cwd, packmindCliHexa);
  if (projectDir) {
    const lockFile = await lockFileRepository.read(projectDir);

    if (lockFile && Object.keys(lockFile.artifacts).length > 0) {
      const deployedFiles = await fetchDeployedFiles(packmindCliHexa, lockFile);

      for (const deployedFile of deployedFiles) {
        const normalizedDeployedPath = normalizePath(deployedFile.path);

        if (stagedPaths.has(normalizedDeployedPath)) {
          continue;
        }

        let localContent: string;
        try {
          localContent = readFile(path.join(projectDir, deployedFile.path));
        } catch {
          continue;
        }

        if (
          deployedFile.content &&
          localContent.trim() !== deployedFile.content.trim()
        ) {
          const result = findArtifactForFile(
            deployedFile.path,
            lockFile.artifacts,
          );
          if (result) {
            untrackedChanges.push({
              artifactName: result.entry.name,
              artifactType: result.entry.type,
              codingAgent: result.agent,
            });
          }
        }
      }
    }
  }

  if (stagedChanges.length > 0) {
    logConsole('Changes to be submitted:');
    for (const change of stagedChanges) {
      const changeType = change.changeType ?? 'updated';
      logConsole(
        `  - ${capitalize(change.artifactType)} "${change.artifactName}" (${changeType}). ${formatLabel(change.codingAgent)}`,
      );
    }
    logConsole('');
    logConsole('Use `packmind playbook submit` to send them');
  }

  if (untrackedChanges.length > 0) {
    if (stagedChanges.length > 0) {
      logConsole('');
    }
    logConsole('Changes not tracked:');
    for (const change of untrackedChanges) {
      logConsole(
        `  - ${capitalize(change.artifactType)} "${change.artifactName}". ${formatLabel(change.codingAgent)}`,
      );
    }
    logConsole('');
    logConsole('Use `packmind playbook add <path>` to track them');
  }

  if (stagedChanges.length === 0 && untrackedChanges.length === 0) {
    logConsole('No changes detected.');
  }

  exit(0);
}
