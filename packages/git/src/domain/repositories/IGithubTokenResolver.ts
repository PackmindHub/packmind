/**
 * Resolves the bearer string used by GithubProvider / GithubRepository
 * when calling the GitHub REST API.
 *
 * The string returned by `getToken()` is substituted into the existing
 * `Authorization: token <value>` header — no `Bearer ` prefix. Concrete
 * implementations decide how the bearer is produced:
 *   - PatTokenResolver: returns a stored Personal Access Token verbatim.
 *   - AppInstallationTokenResolver (step 4): exchanges a signed JWT for
 *     a short-lived installation token and caches it.
 *
 * `onUnauthorized()` is invoked by the Axios response interceptor
 * (wired up in step 3) when a request returns HTTP 401, giving the
 * resolver a chance to react (e.g. mark the installation as revoked).
 * Implementations MUST be idempotent and MUST NOT throw — the
 * interceptor calls this defensively before re-raising the original
 * 401 to the caller.
 */
export interface IGithubTokenResolver {
  /**
   * Returns the bearer string to be inserted into the
   * `Authorization: token <value>` header. Called on every request by
   * the Axios request interceptor — implementations are expected to
   * cache as needed (PAT impl is trivially constant; App impl caches
   * until expiry).
   */
  getToken(): Promise<string>;

  /**
   * Hook fired when an API request returns HTTP 401. Implementations
   * MUST NOT throw. PAT impl is a no-op; the App impl (step 6) will
   * persist a `revokedAt` timestamp on the provider row.
   */
  onUnauthorized(): Promise<void>;

  /**
   * Identifies the authentication kind backing this resolver so callers
   * can pick the correct GitHub endpoint family. `/user/...` endpoints
   * require a user-scoped bearer (PAT); App installation tokens must use
   * `/installation/...` endpoints instead.
   */
  getKind(): 'user' | 'installation';
}
