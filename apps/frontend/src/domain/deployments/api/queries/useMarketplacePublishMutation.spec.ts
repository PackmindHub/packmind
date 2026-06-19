import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  PackmindError,
  type ServerErrorResponse,
} from '../../../../services/api/errors/PackmindError';
import {
  INVALID_TOKEN_MESSAGE,
  mapPublishError,
  useMarketplacePublishMutation,
} from './useMarketplacePublishMutation';
import type {
  MarketplaceDistributionId,
  MarketplaceId,
  OrganizationId,
  PackageId,
  PublishPackageOnMarketplaceResponse,
} from '@packmind/types';

const organizationId = 'org-1' as OrganizationId;
const marketplaceId = 'mkt-1' as MarketplaceId;
const packageId = 'pkg-1' as PackageId;

const buildServerError = (
  status: number,
  message: string,
): ServerErrorResponse => ({
  data: { message },
  status,
  statusText: 'error',
});

const renderUseMutation = (gateway: {
  publishPackageOnMarketplace: jest.Mock;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return renderHook(() => useMarketplacePublishMutation({ gateway }), {
    wrapper,
  });
};

describe('useMarketplacePublishMutation', () => {
  describe('when the gateway resolves with an in_progress response', () => {
    const response: PublishPackageOnMarketplaceResponse = {
      marketplaceDistributionId: 'md-1' as unknown as MarketplaceDistributionId,
      status: 'in_progress',
      marketplaceId,
      packageId,
      pluginSlug: 'my-plugin',
    };
    let publishPackageOnMarketplace: jest.Mock;
    let result: ReturnType<typeof renderUseMutation>['result'];

    beforeEach(async () => {
      publishPackageOnMarketplace = jest.fn().mockResolvedValue(response);
      ({ result } = renderUseMutation({ publishPackageOnMarketplace }));

      act(() => {
        result.current.mutate({ organizationId, marketplaceId, packageId });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('forwards the mutation arguments to the gateway', () => {
      expect(publishPackageOnMarketplace).toHaveBeenCalledWith({
        organizationId,
        marketplaceId,
        packageId,
      });
    });

    it('exposes the response as the mutation data', () => {
      expect(result.current.data).toEqual(response);
    });

    it('does not expose any mutation error', () => {
      expect(result.current.error).toBeNull();
    });
  });

  describe('when the gateway rejects with a PackmindError', () => {
    let error: PackmindError;
    let result: ReturnType<typeof renderUseMutation>['result'];

    beforeEach(async () => {
      error = new PackmindError(
        buildServerError(
          400,
          'The package could not be published. Reason: Invalid or expired Git token.',
        ),
      );
      const publishPackageOnMarketplace = jest.fn().mockRejectedValue(error);

      ({ result } = renderUseMutation({ publishPackageOnMarketplace }));

      act(() => {
        result.current.mutate({ organizationId, marketplaceId, packageId });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('exposes the PackmindError so callers can map it', () => {
      expect(result.current.error).toBe(error);
    });
  });
});

describe('mapPublishError', () => {
  it('maps 409 to name_conflict_unmanaged', () => {
    const error = new PackmindError(
      buildServerError(409, 'plugin name collision'),
    );
    expect(mapPublishError(error)).toBe('name_conflict_unmanaged');
  });

  it('maps 400 with the invalid-token sentence to invalid_token', () => {
    const error = new PackmindError(
      buildServerError(400, INVALID_TOKEN_MESSAGE),
    );
    expect(mapPublishError(error)).toBe('invalid_token');
  });

  describe('when mapping other 400 errors', () => {
    it('maps a missing-descriptor 400 to descriptor_missing', () => {
      const missing = new PackmindError(
        buildServerError(400, 'marketplace.json not found'),
      );
      expect(mapPublishError(missing)).toBe('descriptor_missing');
    });

    it('maps a bad-format-descriptor 400 to descriptor_missing', () => {
      const bad = new PackmindError(
        buildServerError(400, 'descriptor has bad format'),
      );
      expect(mapPublishError(bad)).toBe('descriptor_missing');
    });
  });

  describe('when mapping unknown errors and non-PackmindError values', () => {
    it('maps a plain Error to other', () => {
      expect(mapPublishError(new Error('network down'))).toBe('other');
    });

    it('maps undefined to other', () => {
      expect(mapPublishError(undefined)).toBe('other');
    });

    it('maps an unrecognised PackmindError status to other', () => {
      expect(
        mapPublishError(new PackmindError(buildServerError(500, 'boom'))),
      ).toBe('other');
    });
  });
});
