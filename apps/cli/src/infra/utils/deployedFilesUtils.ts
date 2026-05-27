import { ArtifactVersionEntry, FileModification } from '@packmind/types';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';
import {
  getAgentHomeDirPrefix,
  isAgentHomeDirectory,
} from './agentHomeDirectory';
import { stripFullStandardLinkFooter } from './stripFullStandardLinkFooter';

export type DeploymentGateway = {
  deployment: {
    getContentByVersions(params: {
      artifacts: ArtifactVersionEntry[];
      agents: PackmindLockFile['agents'];
    }): Promise<{ fileUpdates: { createOrUpdate: FileModification[] } }>;
  };
};

export function lockFileToArtifactVersionEntries(
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

export type FetchDeployedFilesOptions = {
  // The project directory the lockfile lives in. When this is a home-install
  // directory (e.g. `~/.claude`), the on-disk file layout has been remapped to
  // omit the agent prefix and to drop the `.packmind/` mirror folder — but the
  // server still returns the original paths. Pass `projectDir` so we can apply
  // the same remap to deployed paths and keep comparisons aligned with disk
  // and lockfile paths.
  projectDir?: string;
};

export async function fetchDeployedFiles(
  gateway: DeploymentGateway,
  lockFile: PackmindLockFile,
  options: FetchDeployedFilesOptions = {},
): Promise<FileModification[]> {
  try {
    const artifacts = lockFileToArtifactVersionEntries(lockFile);
    const response = await gateway.deployment.getContentByVersions({
      artifacts,
      agents: lockFile.agents,
    });
    return remapDeployedFilesForHomeInstall(
      response.fileUpdates.createOrUpdate,
      options.projectDir,
    );
  } catch {
    return [];
  }
}

function remapDeployedFilesForHomeInstall(
  files: FileModification[],
  projectDir: string | undefined,
): FileModification[] {
  if (!projectDir) return files;
  const homeAgent = isAgentHomeDirectory(projectDir);
  if (!homeAgent) return files;
  const prefix = getAgentHomeDirPrefix(homeAgent);
  if (!prefix) return files;

  return files
    .filter((file) => !file.path.startsWith('.packmind/'))
    .map((file) => {
      const remapped = file.path.startsWith(prefix)
        ? { ...file, path: file.path.slice(prefix.length) }
        : { ...file };
      if (remapped.content !== undefined) {
        // Mirror the strip applied by InstallUseCase when rendering content to
        // a home-install dir: the deployed bytes still include the footer link
        // into `.packmind/standards/...`, but the on-disk file does not. Strip
        // here so callers comparing deployed-vs-disk (playbook status/add/
        // submit) see the same normalized content on both sides.
        remapped.content = stripFullStandardLinkFooter(remapped.content);
      }
      return remapped;
    });
}
