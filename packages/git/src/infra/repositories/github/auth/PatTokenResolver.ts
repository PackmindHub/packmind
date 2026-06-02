import { IGithubTokenResolver } from '../../../../domain/repositories/IGithubTokenResolver';

/**
 * Resolver backed by a Personal Access Token.
 *
 * The token is captured at construction time and returned verbatim on
 * every `getToken()` call. `onUnauthorized()` is intentionally a no-op:
 * PAT revocation is a manual user action with no installation row to
 * mark, and we want to preserve the legacy behaviour (a 401 simply
 * propagates to the caller) until step 6 introduces an explicit
 * `revokedAt` projection.
 */
export class PatTokenResolver implements IGithubTokenResolver {
  constructor(private readonly token: string) {}

  async getToken(): Promise<string> {
    return this.token;
  }

  async onUnauthorized(): Promise<void> {
    // No-op. PAT revocation is out of band; see step 6 for the App-side
    // implementation that persists revokedAt.
  }

  getKind(): 'user' {
    return 'user';
  }
}
