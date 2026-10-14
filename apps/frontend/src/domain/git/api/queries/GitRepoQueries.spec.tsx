import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createGitProviderId, createOrganizationId } from '@packmind/types';
import type { MockedFunction } from 'vitest';

import { gitProviderGateway } from '../gateways';
import { useAuthContext } from '../../../accounts/hooks';
import { useSearchProviderBranchesQuery } from './GitRepoQueries';

vi.mock('../../../accounts/hooks', () => ({
  useAuthContext: vi.fn(),
}));

const mockUseAuthContext = useAuthContext as MockedFunction<
  typeof useAuthContext
>;

const params = {
  providerId: createGitProviderId('provider-1'),
  owner: 'o',
  repo: 'r',
  search: '',
};

// Same caching defaults as the app's query client.
const buildWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 10 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('useSearchProviderBranchesQuery', () => {
  let searchProviderBranches: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({
      organization: { id: createOrganizationId('org-1') },
    } as unknown as ReturnType<typeof useAuthContext>);
    searchProviderBranches = vi.spyOn(
      gitProviderGateway,
      'searchProviderBranches',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when the branch input is reopened after a branch was deleted', () => {
    let seenBranches: string[][];

    beforeEach(async () => {
      const wrapper = buildWrapper();
      searchProviderBranches.mockResolvedValue({
        branches: ['deleted', 'main'],
      });
      const first = renderHook(() => useSearchProviderBranchesQuery(params), {
        wrapper,
      });
      await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
      first.unmount();
      await new Promise((resolve) => setTimeout(resolve, 0));

      searchProviderBranches.mockResolvedValue({ branches: ['main'] });
      seenBranches = [];
      const second = renderHook(
        () => {
          const query = useSearchProviderBranchesQuery(params);
          if (query.data) seenBranches.push(query.data.branches);
          return query;
        },
        { wrapper },
      );
      await waitFor(() =>
        expect(second.result.current.data?.branches).toEqual(['main']),
      );
    });

    it('asks the provider again', () => {
      expect(searchProviderBranches).toHaveBeenCalledTimes(2);
    });

    it('never suggests the deleted branch', () => {
      expect(seenBranches.flat()).not.toContain('deleted');
    });
  });
});
