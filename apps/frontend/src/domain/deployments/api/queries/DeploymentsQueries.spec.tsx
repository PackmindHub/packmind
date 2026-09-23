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
import { LIST_PACKAGE_RELEASES_KEY } from '../queryKeys';
import {
  useAddArtefactsToPackagesMutation,
  useRemoveArtefactsFromPackageMutation,
  useUpdatePackageMutation,
  useListPackageReleasesQuery,
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
