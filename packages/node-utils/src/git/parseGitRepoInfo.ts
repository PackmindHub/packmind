// `scheme://[user@]host[:port]/path`: https, http, ssh, git+ssh alike.
const SCHEME_URL_PATH = /^[a-z][a-z0-9+.-]*:\/\/[^/]+\/(.+)$/i;
// scp-like SSH, `[user@]host:path`, which git writes without a scheme.
const SCP_LIKE_PATH = /^(?:[^@/\s]+@)?[^/:\s]+:(?!\/\/)(.+)$/;
// `host[:port]/path` without a scheme, as older CLIs sent it: the host is told
// apart from a group by its dot.
const BARE_HOST_PATH = /^[^/:@\s]+\.[^/:@\s]+(?::\d+)?\/(.+)$/;

/**
 * Owner and repo from a git remote URL, for any host. The repo is the last
 * path segment; the owner is everything before it, so a GitLab subgroup
 * (`group/subgroup/repo`) stays whole. Throws when the URL does not end in
 * `owner/repo`.
 */
export function parseGitRepoInfo(gitRemoteUrl: string): {
  owner: string;
  repo: string;
} {
  // Accepts HTTPS (`https://host/owner/repo`) and SSH (`git@host:owner/repo`)
  // alike, with or without a `.git` suffix or a trailing slash.
  const trimmed = gitRemoteUrl.trim();
  const path = (trimmed.match(SCHEME_URL_PATH) ??
    trimmed.match(SCP_LIKE_PATH) ??
    trimmed.match(BARE_HOST_PATH))?.[1];

  // An scp-like remote may name an absolute path: `git@host:/group/repo.git`.
  const segments = path
    ?.replace(/^\/+|\/+$/g, '')
    .replace(/\.git$/i, '')
    .split('/');

  if (!segments || segments.length < 2 || segments.some((s) => s === '')) {
    throw new Error(`Unable to parse git remote URL: ${gitRemoteUrl}`);
  }

  return {
    owner: segments.slice(0, -1).join('/'),
    repo: segments[segments.length - 1],
  };
}
