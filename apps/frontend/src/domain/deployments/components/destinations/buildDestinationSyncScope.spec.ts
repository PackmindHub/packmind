import {
  createGitRepoId,
  createMarketplaceId,
  createPackageId,
  createTargetId,
} from '@packmind/types';
import type {
  MarketplaceDrift,
  PackageDrift,
  RepositoryDrift,
} from '../redesign/types';
import { buildSpaceDestinations } from './buildSpaceDestinations';
import { buildDestinationSyncScope } from './buildDestinationSyncScope';

const pkg = (
  id: string,
  repoId: string,
  targetId: string,
  behind: boolean,
): PackageDrift =>
  ({
    id: createPackageId(id),
    name: id,
    artifacts: [
      {
        installs: [
          {
            repo: { id: createGitRepoId(repoId) },
            target: { id: createTargetId(targetId) },
            driftReason: behind ? 'behind' : 'aligned',
          },
        ],
      },
    ],
    installLocations: [],
  }) as unknown as PackageDrift;

const repository = (
  id: string,
  name: string,
  targets: Array<{ targetId: string; packages: PackageDrift[] }>,
): RepositoryDrift =>
  ({
    id: createGitRepoId(id),
    repo: { id: createGitRepoId(id), owner: 'acme', name },
    branch: 'main',
    targets: targets.map(({ targetId, packages }) => ({
      id: createTargetId(targetId),
      target: { id: createTargetId(targetId), name: targetId },
      packages,
    })),
  }) as unknown as RepositoryDrift;

const marketplace = (id: string, name: string): MarketplaceDrift =>
  ({
    id: createMarketplaceId(id),
    name,
    plugins: [{ pluginSlug: 'backend', packageName: 'Backend' }],
  }) as unknown as MarketplaceDrift;

const WEBAPP = repository('repo-web', 'webapp', [
  {
    targetId: 'web-root',
    packages: [pkg('Backend', 'repo-web', 'web-root', true)],
  },
]);
const API = repository('repo-api', 'api', [
  {
    targetId: 'api-root',
    packages: [pkg('Backend', 'repo-api', 'api-root', true)],
  },
]);
const ALIGNED = repository('repo-docs', 'docs', [
  {
    targetId: 'docs-root',
    packages: [pkg('Docs', 'repo-docs', 'docs-root', false)],
  },
]);
const CATALOG = marketplace('mkt-1', 'Public catalog');

const DESTINATIONS = buildSpaceDestinations([WEBAPP, API, ALIGNED], [CATALOG]);

describe('buildDestinationSyncScope', () => {
  describe('with one repository picked', () => {
    it('sends the drifted packages in it', () => {
      const scope = buildDestinationSyncScope(
        DESTINATIONS,
        new Set(['r:repo-web']),
      );

      expect(scope?.kind === 'bulk' && scope.packageIds).toEqual([
        createPackageId('Backend'),
      ]);
    });

    it('scopes the distribution to the landing that was picked', () => {
      const scope = buildDestinationSyncScope(
        DESTINATIONS,
        new Set(['r:repo-web']),
      );

      expect(
        scope?.kind === 'bulk' && Array.from(scope.installKeyFilter ?? []),
      ).toEqual(['repo-web::web-root']);
    });
  });

  describe('with the same package drifted in two repositories', () => {
    it('names the package once', () => {
      const scope = buildDestinationSyncScope(
        DESTINATIONS,
        new Set(['r:repo-web', 'r:repo-api']),
      );

      expect(scope?.kind === 'bulk' && scope.packageIds).toHaveLength(1);
    });

    it('keeps both landings, so neither repository keeps its drift', () => {
      const scope = buildDestinationSyncScope(
        DESTINATIONS,
        new Set(['r:repo-web', 'r:repo-api']),
      );

      expect(
        scope?.kind === 'bulk' &&
          Array.from(scope.installKeyFilter ?? []).sort(),
      ).toEqual(['repo-api::api-root', 'repo-web::web-root']);
    });
  });

  describe('with a repository picked that is aligned', () => {
    it('sends nothing', () => {
      const scope = buildDestinationSyncScope(
        DESTINATIONS,
        new Set(['r:repo-docs']),
      );

      expect(scope).toBeNull();
    });
  });

  describe('with a marketplace picked', () => {
    it('sends nothing, since a marketplace is distributed by another call', () => {
      const scope = buildDestinationSyncScope(
        DESTINATIONS,
        new Set(['m:mkt-1']),
      );

      expect(scope).toBeNull();
    });

    it('leaves the repositories picked beside it untouched', () => {
      const scope = buildDestinationSyncScope(
        DESTINATIONS,
        new Set(['m:mkt-1', 'r:repo-web']),
      );

      expect(scope?.kind === 'bulk' && scope.packageIds).toEqual([
        createPackageId('Backend'),
      ]);
    });
  });

  describe('with nothing picked', () => {
    it('sends nothing', () => {
      const scope = buildDestinationSyncScope(DESTINATIONS, new Set());

      expect(scope).toBeNull();
    });
  });
});
