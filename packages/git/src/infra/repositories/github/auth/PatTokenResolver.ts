import { IGithubTokenResolver } from '../../../../domain/repositories/IGithubTokenResolver';

/**
 * Resolver backed by a Personal Access Token, returned verbatim on every
 * call. `onUnauthorized()` is a no-op: a PAT has no installation row to mark,
 * so a 401 simply propagates to the caller.
 */
export class PatTokenResolver implements IGithubTokenResolver {
  constructor(private readonly token: string) {}

  async getToken(): Promise<string> {
    return this.token;
  }

  async onUnauthorized(): Promise<void> {
    // Nothing to do: PAT revocation happens out of band.
  }

  getKind(): 'user' {
    return 'user';
  }
}
