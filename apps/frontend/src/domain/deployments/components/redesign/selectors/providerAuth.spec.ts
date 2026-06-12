import {
  createGitProviderId,
  createGitRepoId,
  type GitProviderId,
} from '@packmind/types';

import { isAppDistributable, providersWithTokenSet } from './providerAuth';
import type { RepoRef } from '../types';

function makeRepo(providerId: GitProviderId): RepoRef {
  return {
    id: createGitRepoId('repo-1'),
    owner: 'acme',
    name: 'webapp',
    providerId,
  };
}

describe('providersWithTokenSet', () => {
  describe('when response is undefined', () => {
    it('returns an empty set', () => {
      expect(providersWithTokenSet(undefined).size).toBe(0);
    });
  });

  describe('when some providers have auth and others do not', () => {
    it('returns only the authenticated provider ids', () => {
      const ok = createGitProviderId('prov-ok');
      const off = createGitProviderId('prov-off');
      const set = providersWithTokenSet({
        providers: [
          { id: ok, hasAuth: true },
          { id: off, hasAuth: false },
        ],
      });
      expect(Array.from(set)).toEqual([ok]);
    });
  });
});

describe('isAppDistributable', () => {
  describe('when repo provider is in the authenticated set', () => {
    it('returns true', () => {
      const providerId = createGitProviderId('prov-ok');
      const repo = makeRepo(providerId);
      expect(isAppDistributable(repo, new Set([providerId]))).toBe(true);
    });
  });

  describe('when repo provider is missing from the authenticated set', () => {
    it('returns false', () => {
      const repo = makeRepo(createGitProviderId('prov-off'));
      expect(
        isAppDistributable(repo, new Set([createGitProviderId('prov-ok')])),
      ).toBe(false);
    });
  });
});
