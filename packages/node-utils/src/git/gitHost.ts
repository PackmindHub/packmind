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
const WEB_REMOTE = /^https?:\/\//i;

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
    // The GitLab client accepts a URL that already names its API root.
    .replace(/(^|\/)api\/v4$/i, '')
    .toLowerCase();
  return path ? path : null;
}

/**
 * The owners a provider may name a remote's group. A web remote of an instance
 * installed under a path prefix carries that prefix before the group
 * (`gitlab/group` under `https://devtools.acme.io/gitlab`), which the provider
 * never reports; an SSH remote never carries it. When the remote is unknown,
 * both readings remain, the owner as given first.
 */
export function ownerReadingsOf(
  owner: string,
  providerUrl: string | null | undefined,
  gitRemoteUrl?: string,
): string[] {
  const prefix = providerPathPrefix(providerUrl);
  if (!prefix || !owner.toLowerCase().startsWith(`${prefix}/`)) {
    return [owner];
  }
  const withoutPrefix = owner.slice(prefix.length + 1);
  if (!gitRemoteUrl) {
    return [owner, withoutPrefix];
  }
  const remoteCarriesPrefix =
    sameGitHost(providerUrl, gitRemoteUrl) && WEB_REMOTE.test(gitRemoteUrl);
  return [remoteCarriesPrefix ? withoutPrefix : owner];
}
