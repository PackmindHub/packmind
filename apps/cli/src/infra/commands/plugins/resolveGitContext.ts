import { PackmindCliHexa } from '../../../PackmindCliHexa';

export type GitContext = { gitRemoteUrl: string; gitBranch: string };

export async function resolveGitContext(
  packmindCliHexa: PackmindCliHexa,
  cwd: string,
): Promise<GitContext> {
  const root = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);
  if (!root) {
    return { gitRemoteUrl: '', gitBranch: '' };
  }
  try {
    return {
      gitRemoteUrl: packmindCliHexa.getGitRemoteUrlFromPath(root),
      gitBranch: packmindCliHexa.getCurrentBranch(root),
    };
  } catch {
    return { gitRemoteUrl: '', gitBranch: '' };
  }
}
