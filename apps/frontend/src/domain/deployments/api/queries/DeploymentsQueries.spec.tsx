import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createOrganizationId,
  createPackageId,
  createSkillId,
  createSpaceId,
} from '@packmind/types';
import type { MockedFunction } from 'vitest';

import { deploymentsGateways } from '../gateways';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import {
  getListPackageReleasesKey,
  LIST_ACTIVE_DISTRIBUTED_PACKAGES_BY_SPACE_KEY,
  LIST_PACKAGE_RELEASES_KEY,
} from '../queryKeys';
import {
  useAddArtefactsToPackagesMutation,
  useRemoveArtefactsFromPackageMutation,
  useUpdatePackageMutation,
  useListPackageReleasesQuery,
  useCreatePackageReleaseMutation,
} from './DeploymentsQueries';

vi.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../gateways', () => ({
  deploymentsGateways: {
    updatePackage: vi.fn(),
    addArtefactsToPackage: vi.fn(),
    removeArtefactsFromPackage: vi.fn(),
    listPackageReleases: vi.fn(),
    createPackageRelease: vi.fn(),
  },
}));

const mockUseAuthContext = useAuthContext as MockedFunction<
  typeof useAuthContext
>;

const organizationId = createOrganizationId('org-1');
const spaceId = createSpaceId('space-1');
const packageId = createPackageId('package-1');
const skillId = createSkillId('skill-1');

/**
 * Readiness is invalidated by prefix, so the assertion is the prefix — not a
 * key built from one package's ids.
 */
const readinessWasInvalidated = (
  spy: MockedFunction<QueryClient['invalidateQueries']>,
): boolean =>
  spy.mock.calls.some(
    ([filters]) => filters?.queryKey === LIST_PACKAGE_RELEASES_KEY,
  );

const driftWasInvalidated = (
  spy: MockedFunction<QueryClient['invalidateQueries']>,
): boolean =>
  spy.mock.calls.some(
    ([filters]) =>
      filters?.queryKey === LIST_ACTIVE_DISTRIBUTED_PACKAGES_BY_SPACE_KEY,
  );

function buildHarness(staleTime?: number) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime },
    },
  });

  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue(undefined) as unknown as MockedFunction<
    QueryClient['invalidateQueries']
  >;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, invalidateQueries, queryClient };
}

describe('DeploymentsQueries package release readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthContext.mockReturnValue({
      organization: { id: organizationId },
    } as unknown as ReturnType<typeof useAuthContext>);
  });

  describe('when a package is renamed or its description edited', () => {
    it('invalidates the release readiness', async () => {
      (
        deploymentsGateways.updatePackage as MockedFunction<
          typeof deploymentsGateways.updatePackage
        >
      ).mockResolvedValue({} as never);

      const { wrapper, invalidateQueries } = buildHarness();
      const { result } = renderHook(() => useUpdatePackageMutation(), {
        wrapper,
      });

      await result.current.mutateAsync({
        organizationId,
        spaceId,
        packageId,
        name: 'frontend-package',
        description: 'A renamed package',
      } as never);

      await waitFor(() =>
        expect(readinessWasInvalidated(invalidateQueries)).toBe(true),
      );
    });

    /*
     * The release gate decides `hasUnreleasedChanges` on every landing, and the
     * gate reads the name and the description. Refreshing only the readiness
     * left the Distribution tab calling a pinned repository up to date beside a
     * release bar offering the release that would fix it.
     */
    it('invalidates the drift the destinations are read from', async () => {
      (
        deploymentsGateways.updatePackage as MockedFunction<
          typeof deploymentsGateways.updatePackage
        >
      ).mockResolvedValue({} as never);

      const { wrapper, invalidateQueries } = buildHarness();
      const { result } = renderHook(() => useUpdatePackageMutation(), {
        wrapper,
      });

      await result.current.mutateAsync({
        organizationId,
        spaceId,
        packageId,
        name: 'frontend-package',
        description: 'A renamed package',
      } as never);

      await waitFor(() =>
        expect(driftWasInvalidated(invalidateQueries)).toBe(true),
      );
    });
  });

  describe('when a release is cut', () => {
    const cutARelease = async () => {
      (
        deploymentsGateways.createPackageRelease as MockedFunction<
          typeof deploymentsGateways.createPackageRelease
        >
      ).mockResolvedValue({} as never);

      const harness = buildHarness();
      const { result } = renderHook(() => useCreatePackageReleaseMutation(), {
        wrapper: harness.wrapper,
      });

      await result.current.mutateAsync({
        organizationId,
        spaceId,
        packageId,
        version: '0.4.0',
      } as never);

      return harness;
    };

    /* This one names the package, unlike the prefix invalidations above it. */
    it('invalidates the list of releases', async () => {
      const { invalidateQueries } = await cutARelease();

      await waitFor(() =>
        expect(
          invalidateQueries.mock.calls.some(
            ([filters]) =>
              JSON.stringify(filters?.queryKey) ===
              JSON.stringify(
                getListPackageReleasesKey(spaceId, organizationId, packageId),
              ),
          ),
        ).toBe(true),
      );
    });

    /*
     * The drift of every pinned destination of this package has just changed:
     * one sitting on what was the newest release is now a release behind, and
     * what it is offered changes from cutting a release to distributing it.
     * Without this the rows keep offering `Create a release` after the release
     * has been created.
     */
    it('invalidates the drift the destinations are read from', async () => {
      const { invalidateQueries } = await cutARelease();

      await waitFor(() =>
        expect(driftWasInvalidated(invalidateQueries)).toBe(true),
      );
    });
  });

  describe('when a component is added to a package', () => {
    it('invalidates the release readiness', async () => {
      (
        deploymentsGateways.addArtefactsToPackage as MockedFunction<
          typeof deploymentsGateways.addArtefactsToPackage
        >
      ).mockResolvedValue({} as never);

      const { wrapper, invalidateQueries } = buildHarness();
      const { result } = renderHook(() => useAddArtefactsToPackagesMutation(), {
        wrapper,
      });

      await result.current.mutateAsync({
        spaceId,
        entries: [{ packageId, skillIds: [skillId] }],
      });

      await waitFor(() =>
        expect(readinessWasInvalidated(invalidateQueries)).toBe(true),
      );
    });

    it('leaves the release readiness alone when every add failed', async () => {
      (
        deploymentsGateways.addArtefactsToPackage as MockedFunction<
          typeof deploymentsGateways.addArtefactsToPackage
        >
      ).mockRejectedValue(new Error('nope'));

      const { wrapper, invalidateQueries } = buildHarness();
      const { result } = renderHook(() => useAddArtefactsToPackagesMutation(), {
        wrapper,
      });

      await result.current.mutateAsync({
        spaceId,
        entries: [{ packageId, skillIds: [skillId] }],
      });

      expect(readinessWasInvalidated(invalidateQueries)).toBe(false);
    });

    /*
     * The component the package just gained is what moves it past the release
     * its destinations are pinned to, so the tab showing where they stand has
     * to be asked again. It was not, and the only thing that moved the status
     * was reloading the page.
     */
    it('invalidates the drift the destinations are read from', async () => {
      (
        deploymentsGateways.addArtefactsToPackage as MockedFunction<
          typeof deploymentsGateways.addArtefactsToPackage
        >
      ).mockResolvedValue({} as never);

      const { wrapper, invalidateQueries } = buildHarness();
      const { result } = renderHook(() => useAddArtefactsToPackagesMutation(), {
        wrapper,
      });

      await result.current.mutateAsync({
        spaceId,
        entries: [{ packageId, skillIds: [skillId] }],
      });

      await waitFor(() =>
        expect(driftWasInvalidated(invalidateQueries)).toBe(true),
      );
    });
  });

  describe('when a component is removed from a package', () => {
    it('invalidates the release readiness', async () => {
      (
        deploymentsGateways.removeArtefactsFromPackage as MockedFunction<
          typeof deploymentsGateways.removeArtefactsFromPackage
        >
      ).mockResolvedValue({} as never);

      const { wrapper, invalidateQueries } = buildHarness();
      const { result } = renderHook(
        () => useRemoveArtefactsFromPackageMutation(),
        { wrapper },
      );

      await result.current.mutateAsync({
        spaceId,
        packageId,
        skillIds: [skillId],
      });

      await waitFor(() =>
        expect(readinessWasInvalidated(invalidateQueries)).toBe(true),
      );
    });

    it('invalidates the drift the destinations are read from', async () => {
      (
        deploymentsGateways.removeArtefactsFromPackage as MockedFunction<
          typeof deploymentsGateways.removeArtefactsFromPackage
        >
      ).mockResolvedValue({} as never);

      const { wrapper, invalidateQueries } = buildHarness();
      const { result } = renderHook(
        () => useRemoveArtefactsFromPackageMutation(),
        { wrapper },
      );

      await result.current.mutateAsync({
        spaceId,
        packageId,
        skillIds: [skillId],
      });

      await waitFor(() =>
        expect(driftWasInvalidated(invalidateQueries)).toBe(true),
      );
    });
  });

  describe('when the package pane is re-entered', () => {
    it('refetches the readiness the cache still considers fresh', async () => {
      (
        deploymentsGateways.listPackageReleases as MockedFunction<
          typeof deploymentsGateways.listPackageReleases
        >
      ).mockResolvedValue({
        readiness: { releasable: false },
        releases: [],
      } as never);

      const { wrapper } = buildHarness(1000 * 60 * 10);
      const { unmount } = renderHook(
        () => useListPackageReleasesQuery(organizationId, spaceId, packageId),
        { wrapper },
      );

      await waitFor(() => {
        expect(deploymentsGateways.listPackageReleases).toHaveBeenCalledTimes(
          1,
        );
      });

      unmount();

      renderHook(
        () => useListPackageReleasesQuery(organizationId, spaceId, packageId),
        { wrapper },
      );

      await waitFor(() => {
        expect(deploymentsGateways.listPackageReleases).toHaveBeenCalledTimes(
          2,
        );
      });
    });
  });
});
