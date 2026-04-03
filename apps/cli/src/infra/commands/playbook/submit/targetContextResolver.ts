import * as path from 'path';
import { FileModification } from '@packmind/types';
import { PlaybookChangeEntry } from '../../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../../domain/repositories/ILockFileRepository';
import { PackmindLockFile } from '../../../../domain/repositories/PackmindLockFile';
import { PackmindCliHexa } from '../../../../PackmindCliHexa';
import { findNearestConfigDir } from '../../../../application/utils/findNearestConfigDir';
import { fetchDeployedFiles } from '../../../utils/deployedFilesUtils';

export type TargetContext = {
  lockFile: PackmindLockFile | null;
  deployedFiles: FileModification[];
  projectDir: string | null;
};

export type TargetContextResolver = {
  getTargetContext: (entry: PlaybookChangeEntry) => Promise<TargetContext>;
  getCachedContext: (
    configDir: string | undefined,
  ) => TargetContext | undefined;
};

export async function createTargetContextResolver(deps: {
  lockFileRepository: ILockFileRepository;
  cwd: string;
  packmindCliHexa: PackmindCliHexa;
}): Promise<TargetContextResolver> {
  const { lockFileRepository, cwd, packmindCliHexa } = deps;
  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);
  const cache = new Map<string, TargetContext>();

  return {
    getTargetContext: async (entry) => {
      const key = entry.configDir ?? '__cwd__';
      if (cache.has(key)) return cache.get(key)!;

      let projectDir: string | null;
      if (entry.configDir !== undefined && gitRoot) {
        projectDir = path.join(gitRoot, entry.configDir);
      } else {
        projectDir = await findNearestConfigDir(cwd, packmindCliHexa);
      }

      const lockFile = projectDir
        ? await lockFileRepository.read(projectDir)
        : null;
      const deployedFiles =
        lockFile && Object.keys(lockFile.artifacts).length > 0
          ? await fetchDeployedFiles(
              packmindCliHexa.getPackmindGateway(),
              lockFile,
            )
          : [];

      const ctx = { lockFile, deployedFiles, projectDir };
      cache.set(key, ctx);
      return ctx;
    },
    getCachedContext: (configDir) => cache.get(configDir ?? '__cwd__'),
  };
}
