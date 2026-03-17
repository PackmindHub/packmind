import * as path from 'path';

import { findNearestConfigDir } from '../../application/utils/findNearestConfigDir';
import { resolveDeployedContext } from '../../application/utils/resolveDeployedContext';
import { normalizePath } from '../../application/utils/pathUtils';
import { formatLabel, logConsole } from '../utils/consoleLogger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { PackmindLockFileEntry } from '../../domain/repositories/PackmindLockFile';

export type PlaybookStatusHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  playbookLocalRepository: IPlaybookLocalRepository;
  lockFileRepository: ILockFileRepository;
  repoRoot: string;
  exit: (code: number) => void;
  readFile: (path: string) => string;
};

type UntrackedChange = {
  artifactName: string;
  artifactType: string;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

export async function playbookStatusHandler(
  deps: PlaybookStatusHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    playbookLocalRepository,
    lockFileRepository,
    repoRoot,
    exit,
    readFile,
  } = deps;

  const stagedChanges = playbookLocalRepository.getChanges();
  const stagedPaths = new Set(
    stagedChanges.map((c) => normalizePath(c.filePath)),
  );

  const untrackedChanges: UntrackedChange[] = [];

  const projectDir = await findNearestConfigDir(repoRoot, packmindCliHexa);
  if (projectDir) {
    const lockFile = await lockFileRepository.read(projectDir);

    if (lockFile && Object.keys(lockFile.artifacts).length > 0) {
      const deployedContext = await resolveDeployedContext(
        packmindCliHexa,
        projectDir,
      );

      if (deployedContext?.deployedContent) {
        for (const deployedFile of deployedContext.deployedContent.fileUpdates
          .createOrUpdate) {
          const normalizedDeployedPath = normalizePath(deployedFile.path);

          if (stagedPaths.has(normalizedDeployedPath)) {
            continue;
          }

          let localContent: string;
          try {
            localContent = readFile(path.join(repoRoot, deployedFile.path));
          } catch {
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
              });
            }
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
        `  - ${capitalize(change.artifactType)} "${change.artifactName}"`,
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
