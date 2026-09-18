/**
 * The host part of a git remote URL, always as `https://host`: an SSH remote is
 * rewritten to that form so the result can be compared against a stored git
 * provider URL whatever scheme the remote used.
 */
export function extractBaseUrl(gitRemoteUrl: string): string {
  const httpsMatch = gitRemoteUrl.match(/^(https?:\/\/[^/]+)/i);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  const sshMatch = gitRemoteUrl.match(/^git@([^:]+):/i);
  if (sshMatch) {
    return `https://${sshMatch[1]}`;
  }

  // Neither shape matched: hand back the input rather than throwing.
  return gitRemoteUrl;
}
