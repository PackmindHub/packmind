import * as path from 'path';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { GetDeployedContentResponse } from '@packmind/types';

export interface DeployedContext {
  spaceId: string;
  targetId?: string;
  deployedContent: GetDeployedContentResponse;
}

export async function resolveDeployedContext(
  packmindCliHexa: PackmindCliHexa,
  targetDir: string,
): Promise<DeployedContext | null> {
  try {
    const space = await packmindCliHexa.getDefaultSpace();

    const fullConfig = await packmindCliHexa.readFullConfig(targetDir);
    const configPackages = fullConfig ? Object.keys(fullConfig.packages) : [];
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(targetDir);

    if (!gitRoot || configPackages.length === 0) {
      return null;
    }

    const gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
    const gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);
    const rel = path.relative(gitRoot, targetDir);
    const relativePath = rel.startsWith('..') ? '/' : rel ? `/${rel}/` : '/';

    const deployedContent = await packmindCliHexa
      .getPackmindGateway()
      .deployment.getDeployed({
        packagesSlugs: configPackages,
        gitRemoteUrl,
        gitBranch,
        relativePath,
        agents: fullConfig?.agents,
      });

    return {
      spaceId: space.id,
      targetId: deployedContent.targetId,
      deployedContent,
    };
  } catch {
    return null;
  }
}
