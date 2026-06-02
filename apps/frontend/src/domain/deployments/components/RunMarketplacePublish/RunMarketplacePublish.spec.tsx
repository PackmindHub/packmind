import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider, pmToaster } from '@packmind/ui';
import type {
  MarketplaceId,
  MarketplaceListItem,
  OrganizationId,
  Package,
  PackageId,
  SpaceId,
} from '@packmind/types';
import { RunMarketplacePublish } from './RunMarketplacePublish';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useMarketplaces } from '../../../marketplaces/api/queries/MarketplaceQueries';
import { useMarketplacePublishMutation } from '../../api/queries/useMarketplacePublishMutation';
import {
  PackmindError,
  type ServerErrorResponse,
} from '../../../../services/api/errors/PackmindError';

jest.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('../../../marketplaces/api/queries/MarketplaceQueries', () => ({
  useMarketplaces: jest.fn(),
}));

jest.mock('../../api/queries/useMarketplacePublishMutation', () => {
  const actual = jest.requireActual(
    '../../api/queries/useMarketplacePublishMutation',
  );
  return {
    ...actual,
    useMarketplacePublishMutation: jest.fn(),
  };
});

const successToast = jest
  .spyOn(pmToaster, 'success')
  .mockImplementation(() => '');
const errorToast = jest.spyOn(pmToaster, 'error').mockImplementation(() => '');

const mockedUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;
const mockedUseMarketplaces = useMarketplaces as jest.MockedFunction<
  typeof useMarketplaces
>;
const mockedUseMarketplacePublishMutation =
  useMarketplacePublishMutation as jest.MockedFunction<
    typeof useMarketplacePublishMutation
  >;

const organizationId = 'org-1' as OrganizationId;
const fakeMarketplaceId = 'mkt-1' as MarketplaceId;

const fakeMarketplace = (
  overrides: Partial<MarketplaceListItem> = {},
): MarketplaceListItem =>
  ({
    id: fakeMarketplaceId,
    organizationId,
    gitRepoId: 'repo-1',
    name: 'Acme Playbook',
    vendor: 'anthropic',
    addedBy: 'user-1',
    linkedAt: new Date('2026-04-01T10:00:00.000Z'),
    state: 'healthy',
    lastValidatedAt: new Date('2026-04-01T10:00:00.000Z'),
    descriptor: {
      vendor: 'anthropic',
      name: 'Acme Playbook',
      plugins: [],
      raw: {},
    },
    pluginCount: 3,
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    deletedAt: null,
    addedByUserName: 'Jane Admin',
    ...overrides,
  }) as unknown as MarketplaceListItem;

const fakePackage: Package = {
  id: 'pkg-1' as PackageId,
  spaceId: 'space-1' as SpaceId,
  slug: 'pkg-1',
  name: 'Security checks',
  description: '',
  recipes: [],
  standards: [],
  skills: [],
} as unknown as Package;

const renderModal = (overrides: { open?: boolean } = {}) => {
  const onOpenChange = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        <RunMarketplacePublish
          open={overrides.open ?? true}
          onOpenChange={onOpenChange}
          selectedPackages={[fakePackage]}
        />
      </QueryClientProvider>
    </UIProvider>,
  );
  return { onOpenChange };
};

const buildServerError = (
  status: number,
  message: string,
): ServerErrorResponse => ({
  data: { message },
  status,
  statusText: 'error',
});

const setMutation = (
  overrides: Partial<{
    mutateAsync: jest.Mock;
    isPending: boolean;
    reset: jest.Mock;
  }> = {},
) => {
  const mutateAsync = overrides.mutateAsync ?? jest.fn();
  const reset = overrides.reset ?? jest.fn();
  mockedUseMarketplacePublishMutation.mockReturnValue({
    mutateAsync,
    mutate: jest.fn(),
    isPending: overrides.isPending ?? false,
    reset,
  } as unknown as ReturnType<typeof useMarketplacePublishMutation>);
  return { mutateAsync, reset };
};

describe('RunMarketplacePublish', () => {
  beforeEach(() => {
    mockedUseAuthContext.mockReturnValue({
      organization: { id: organizationId },
      user: { id: 'u-1', email: 'someone@packmind.com' },
    } as unknown as ReturnType<typeof useAuthContext>);
    mockedUseMarketplaces.mockReturnValue({
      data: [fakeMarketplace()],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useMarketplaces>);
    setMutation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal title, subtitle and submit button when marketplaces are loaded', async () => {
    renderModal();

    expect(
      await screen.findByRole('heading', { name: 'Publish to a marketplace' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pick a linked marketplace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByText('Acme Playbook')).toBeInTheDocument();
  });

  it('shows the empty state when no marketplaces are linked', async () => {
    mockedUseMarketplaces.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useMarketplaces>);

    renderModal();

    expect(
      await screen.findByText(/No marketplaces linked yet/i),
    ).toBeInTheDocument();
    // Submit stays disabled while there is nothing to pick.
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('submits the publish mutation and surfaces a success toast on resolution', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({
      marketplaceDistributionId: 'md-1',
      status: 'in_progress',
      marketplaceId: fakeMarketplaceId,
      packageId: fakePackage.id,
      pluginSlug: 'security-checks',
    });
    setMutation({ mutateAsync });

    const { onOpenChange } = renderModal();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        organizationId,
        marketplaceId: fakeMarketplaceId,
        packageId: fakePackage.id,
      });
    });
    expect(successToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Publish started' }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('surfaces the verbatim invalid-token toast on a 400 invalid-token error', async () => {
    const mutateAsync = jest
      .fn()
      .mockRejectedValue(
        new PackmindError(
          buildServerError(
            400,
            'The package could not be published. Reason: Invalid or expired Git token.',
          ),
        ),
      );
    setMutation({ mutateAsync });

    renderModal();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    await waitFor(() => {
      expect(errorToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Publish failed',
          description:
            'The package could not be published. Reason: Invalid or expired Git token.',
        }),
      );
    });
  });

  it('surfaces the name-collision toast on a 409 response', async () => {
    const mutateAsync = jest
      .fn()
      .mockRejectedValue(
        new PackmindError(buildServerError(409, 'plugin name conflict')),
      );
    setMutation({ mutateAsync });

    renderModal();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    await waitFor(() => {
      expect(errorToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Publish failed',
          description: expect.stringContaining(
            'another plugin with the same name already exists',
          ),
        }),
      );
    });
  });

  it('surfaces the descriptor-bad-format toast on a generic 400', async () => {
    const mutateAsync = jest
      .fn()
      .mockRejectedValue(
        new PackmindError(buildServerError(400, 'descriptor bad format')),
      );
    setMutation({ mutateAsync });

    renderModal();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    await waitFor(() => {
      expect(errorToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Publish failed',
          description: expect.stringContaining(
            'marketplace descriptor (marketplace.json) is missing or malformed',
          ),
        }),
      );
    });
  });
});
