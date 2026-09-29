// `scheme://[user@]host[:port]/...`: https, http, ssh, git+ssh alike.
const SCHEME_URL = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/:?#]+)/i;
// scp-like SSH, `[user@]host:path`, which git writes without a scheme.
const SCP_LIKE = /^(?:[^@/\s]+@)?([^/:\s]+):(?!\/\/)/;
// A bare `host[:port][/path]`, as an admin may type a provider URL.
const BARE_HOST = /^([^/:@\s]+)(?::\d+)?(?:\/|$)/;

/**
 * The host of a git remote or of a git provider URL, lowercased, without
 * scheme, user or port — or null when none can be read. The port is dropped
 * on purpose: an SSH remote reaches the same instance as its web URL on
 * another port.
 */
export function gitHostOf(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }
  const match =
    trimmed.match(SCHEME_URL) ??
    trimmed.match(SCP_LIKE) ??
    trimmed.match(BARE_HOST);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Whether a git provider URL and a git remote (or another provider URL) point
 * at the same instance. Compares hosts only: a path prefix on the provider
 * URL, the scheme, the user and the port do not matter. False when either
 * host cannot be read.
 */
export function sameGitHost(
  providerUrl: string | null | undefined,
  gitRemoteUrl: string | null | undefined,
): boolean {
  const providerHost = gitHostOf(providerUrl);
  return providerHost !== null && providerHost === gitHostOf(gitRemoteUrl);
}
