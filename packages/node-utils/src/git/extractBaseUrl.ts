import { gitHostOf } from './gitHost';

/**
 * The host part of a git remote URL, always as `https://host`: an SSH remote is
 * rewritten to that form so the result can be compared against a stored git
 * provider URL whatever scheme the remote used. A user in the remote is
 * dropped; the port of an http(s) remote is kept, that of an SSH one is not.
 */
export function extractBaseUrl(gitRemoteUrl: string): string {
  const httpsMatch = gitRemoteUrl.match(/^(https?:\/\/)(?:[^@/]*@)?([^/]+)/i);
  if (httpsMatch) {
    return `${httpsMatch[1]}${httpsMatch[2]}`;
  }

  const host = gitHostOf(gitRemoteUrl);
  if (host) {
    return `https://${host}`;
  }

  // Neither shape matched: hand back the input rather than throwing.
  return gitRemoteUrl;
}
