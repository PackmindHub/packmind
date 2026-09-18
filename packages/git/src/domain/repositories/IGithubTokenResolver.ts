/**
 * Resolves the bearer string used by GithubProvider / GithubRepository
 * when calling the GitHub REST API.
 *
 * The string returned by `getToken()` is substituted into an
 * `Authorization: token <value>` header — no `Bearer ` prefix.
 */
export interface IGithubTokenResolver {
  /**
   * Called on every request by the Axios request interceptor, so
   * implementations are expected to cache as needed.
   */
  getToken(): Promise<string>;

  /**
   * Fired by the Axios response interceptor when a request returns HTTP 401,
   * before the 401 is re-raised to the caller. Implementations MUST be
   * idempotent and MUST NOT throw.
   */
  onUnauthorized(): Promise<void>;

  /**
   * Lets callers pick the correct GitHub endpoint family: `/user/...`
   * endpoints require a user-scoped bearer (PAT), while App installation
   * tokens must use `/installation/...` instead.
   */
  getKind(): 'user' | 'installation';
}
