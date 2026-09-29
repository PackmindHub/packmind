// An IPv6 literal is bracketed and holds colons, so it cannot end at one.
const HOST = String.raw`(\[[0-9a-f:.]+\]|[^/:?#@\s\[\]]+)`;
// `scheme://[user@]host[:port]/...`: https, http, ssh, git+ssh alike.
const SCHEME_URL = new RegExp(
  String.raw`^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?${HOST}`,
  'i',
);
// scp-like SSH, `[user@]host:path`, which git writes without a scheme.
const SCP_LIKE = new RegExp(String.raw`^(?:[^@/\s]+@)?${HOST}:(?!\/\/)`, 'i');
// A bare `host[:port][/path]`, as an admin may type a provider URL.
const BARE_HOST = new RegExp(String.raw`^${HOST}(?::\d+)?(?:\/|$)`, 'i');

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

// Only a web URL can carry an installation prefix: a CLI-managed provider may
// hold a whole ssh:// remote, whose path is a repository, not a prefix.
const WEB_URL_PATH = /^https?:\/\/[^/]+\/([^?#]*)/i;

/**
 * The path a provider URL puts before every group, lowercased and without
 * slashes — `gitlab` for `https://devtools.acme.io/gitlab` — or null when the
 * instance sits at the root of its host.
 */
export function providerPathPrefix(
  providerUrl: string | null | undefined,
): string | null {
  const path = providerUrl
    ?.trim()
    .match(WEB_URL_PATH)?.[1]
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
  return path ? path : null;
}

/**
 * The owner as the provider names it. A remote cloned from an instance
 * installed under a path prefix carries that prefix before the group
 * (`gitlab/group` under `https://devtools.acme.io/gitlab`), which the provider
 * never reports. Only providers on the remote's host are considered when the
 * remote is known.
 */
export function ownerWithoutProviderPrefix(
  owner: string,
  providerUrls: ReadonlyArray<string | null | undefined>,
  gitRemoteUrl?: string,
): string {
  for (const providerUrl of providerUrls) {
    if (gitRemoteUrl && !sameGitHost(providerUrl, gitRemoteUrl)) {
      continue;
    }
    const prefix = providerPathPrefix(providerUrl);
    if (prefix && owner.toLowerCase().startsWith(`${prefix}/`)) {
      return owner.slice(prefix.length + 1);
    }
  }
  return owner;
}
