/**
 * Owner and repo from a git remote URL, for any host. Throws when the URL does
 * not end in `owner/repo`.
 */
export function parseGitRepoInfo(gitRemoteUrl: string): {
  owner: string;
  repo: string;
} {
  // Accepts HTTPS (`https://host/owner/repo`) and SSH (`git@host:owner/repo`)
  // alike, with or without a `.git` suffix or a trailing slash.
  const match = gitRemoteUrl.match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/i);

  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }

  throw new Error(`Unable to parse git remote URL: ${gitRemoteUrl}`);
}
