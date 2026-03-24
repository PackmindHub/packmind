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
import { PackmindLockFileEntry } from '../../../domain/repositories/PackmindLockFile';
import { fetchDeployedFiles } from '../../utils/deployedFilesUtils';

export type PlaybookStatusHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  playbookLocalRepository: IPlaybookLocalRepository;
  lockFileRepository: ILockFileRepository;
  cwd: string;
  exit: (code: number) => void;
  readFile: (path: string) => string;
  listDirectoryFiles: (dirPath: string) => string[];
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

function groupStagedChanges(
  changes: PlaybookChangeEntry[],
  cwd: string,
  gitRoot: string | null,
): GroupedChange[] {
  const groups = new Map<string, GroupedChange>();
  for (const change of changes) {
    const changeType = change.changeType ?? 'updated';
    const key = `${change.artifactType}:${change.artifactName}:${changeType}`;
    const rootRelativePath = change.configDir
      ? `${change.configDir}/${change.filePath}`
      : change.filePath;
    const displayPath = gitRoot
      ? normalizePath(path.relative(cwd, path.join(gitRoot, rootRelativePath)))
      : rootRelativePath;
    const existing = groups.get(key);
    if (existing) {
      existing.filePaths.push(displayPath);
    } else {
      groups.set(key, {
        artifactName: change.artifactName,
        artifactType: change.artifactType,
        changeType,
        spaceName: change.spaceName,
        filePaths: [displayPath],
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
    listDirectoryFiles,
  } = deps;

  const stagedChanges = playbookLocalRepository.getChanges();

  const untrackedChanges: UntrackedChange[] = [];

  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);

  // Group staged changes by configDir
  const stagedByConfigDir = new Map<string, PlaybookChangeEntry[]>();
  for (const change of stagedChanges) {
    const key = change.configDir ?? '__cwd__';
    const group = stagedByConfigDir.get(key) ?? [];
    group.push(change);
    stagedByConfigDir.set(key, group);
  }

  // Also process configDirs that have no staged changes (for untracked detection)
  const fallbackConfigDir = await findNearestConfigDir(cwd, packmindCliHexa);

  const configDirs = new Set([...stagedByConfigDir.keys()]);
  if (fallbackConfigDir && !configDirs.has('__cwd__')) {
    const rel = gitRoot
      ? normalizePath(path.relative(gitRoot, fallbackConfigDir))
      : '';
    if (!configDirs.has(rel)) configDirs.add(rel);
  }

  // Also scan descendant targets (sub-targets below cwd)
  const descendantDirs = await packmindCliHexa.findDescendantConfigs(cwd);
  for (const descendantDir of descendantDirs) {
    const rel = gitRoot
      ? normalizePath(path.relative(gitRoot, descendantDir))
      : normalizePath(path.relative(cwd, descendantDir));
    if (!configDirs.has(rel)) configDirs.add(rel);
  }

  for (const configDirKey of configDirs) {
    let projectDir: string | null;
    if (configDirKey === '__cwd__') {
      projectDir = fallbackConfigDir;
    } else if (gitRoot) {
      projectDir = path.join(gitRoot, configDirKey);
    } else {
      continue;
    }

    if (!projectDir) continue;
    const lockFile = await lockFileRepository.read(projectDir);
    if (!lockFile || Object.keys(lockFile.artifacts).length === 0) continue;

    const deployedFiles = await fetchDeployedFiles(
      packmindCliHexa.getPackmindGateway(),
      lockFile,
    );
    // Build staged path set for this target
    const targetStagedPaths = new Set(
      (stagedByConfigDir.get(configDirKey) ?? []).map((c) =>
        normalizePath(c.filePath),
      ),
    );
    const targetSkillDirPaths = (stagedByConfigDir.get(configDirKey) ?? [])
      .filter((c) => c.artifactType === 'skill')
      .map((c) => normalizePath(c.filePath));

    for (const deployedFile of deployedFiles) {
      const normalizedDeployedPath = normalizePath(deployedFile.path);

      if (
        targetStagedPaths.has(normalizedDeployedPath) ||
        targetSkillDirPaths.some((staged) =>
          normalizedDeployedPath.startsWith(staged + '/'),
        )
      ) {
        continue;
      }

      const displayPath = normalizePath(
        path.relative(cwd, path.join(projectDir, deployedFile.path)),
      );
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
            filePath: displayPath,
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
            filePath: displayPath,
          });
        }
      }
    }

    // Detect new local files in skill directories that are not in the deployed set
    const deployedPathSet = new Set(
      deployedFiles.map((f) => normalizePath(f.path)),
    );
    for (const entry of Object.values(lockFile.artifacts)) {
      if (entry.type !== 'skill') continue;

      // Derive the skill directory from SKILL.md path
      const skillMdFile = entry.files.find((f) =>
        normalizePath(f.path).endsWith('/SKILL.md'),
      );
      if (!skillMdFile) continue;
      const skillDir = normalizePath(path.dirname(skillMdFile.path));

      // Skip if this skill is already staged
      if (
        targetStagedPaths.has(skillDir) ||
        targetSkillDirPaths.some(
          (staged) => skillDir === staged || skillDir.startsWith(staged + '/'),
        )
      ) {
        continue;
      }

      const absoluteSkillDir = path.join(projectDir, skillDir);
      let localFiles: string[];
      try {
        localFiles = listDirectoryFiles(absoluteSkillDir);
      } catch {
        continue;
      }

      for (const localRelPath of localFiles) {
        const normalizedLocalPath = normalizePath(
          path.join(skillDir, localRelPath),
        );
        if (!deployedPathSet.has(normalizedLocalPath)) {
          const displayPath = normalizePath(
            path.relative(cwd, path.join(projectDir, normalizedLocalPath)),
          );
          untrackedChanges.push({
            artifactName: entry.name,
            artifactType: entry.type,
            filePath: displayPath,
          });
        }
      }
    }
  }

  const groupedStaged = groupStagedChanges(stagedChanges, cwd, gitRoot);
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
