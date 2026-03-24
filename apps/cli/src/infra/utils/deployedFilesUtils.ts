import { ArtifactVersionEntry, FileModification } from '@packmind/types';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';

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

export async function fetchDeployedFiles(
  gateway: DeploymentGateway,
  lockFile: PackmindLockFile,
): Promise<FileModification[]> {
  try {
    const artifacts = lockFileToArtifactVersionEntries(lockFile);
    const response = await gateway.deployment.getContentByVersions({
      artifacts,
      agents: lockFile.agents,
    });
    return response.fileUpdates.createOrUpdate;
  } catch {
    return [];
  }
}
