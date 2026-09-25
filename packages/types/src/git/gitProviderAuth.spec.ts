import { createGitProviderId, GitProvider } from './GitProvider';
import { createOrganizationId } from '../accounts/Organization';
import { toGitProviderWithoutToken } from './gitProviderAuth';

describe('toGitProviderWithoutToken', () => {
  const provider: GitProvider = {
    id: createGitProviderId('provider-1'),
    source: 'github',
    organizationId: createOrganizationId('org-1'),
    url: 'https://github.com',
    token: 'ghp_decrypted-secret',
    authMethod: 'token',
    displayName: 'Production',
  };

  describe('when the provider has a token', () => {
    const result = toGitProviderWithoutToken(provider);

    it('drops the token', () => {
      expect(result).not.toHaveProperty('token');
    });

    it('reports that a token is configured', () => {
      expect(result.hasAuth).toBe(true);
    });

    it('keeps the other fields', () => {
      expect(result).toEqual(
        expect.objectContaining({ id: provider.id, displayName: 'Production' }),
      );
    });
  });

  describe('when the stored token cannot be decrypted', () => {
    it('still reports that a token is configured', () => {
      expect(
        toGitProviderWithoutToken({
          ...provider,
          token: null,
          tokenUnreadable: true,
        }).hasAuth,
      ).toBe(true);
    });
  });

  describe('when the provider has no credentials', () => {
    it('reports that no token is configured', () => {
      expect(
        toGitProviderWithoutToken({ ...provider, token: null }).hasAuth,
      ).toBe(false);
    });
  });
});
