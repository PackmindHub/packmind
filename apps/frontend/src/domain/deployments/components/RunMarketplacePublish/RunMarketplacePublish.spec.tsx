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
const warningToast = jest
  .spyOn(pmToaster, 'warning')
  .mockImplementation(() => '');

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

const buildPackage = (id: string, name: string): Package =>
  ({
    id: id as PackageId,
    spaceId: 'space-1' as SpaceId,
    slug: id,
    name,
    description: '',
    recipes: [],
    standards: [],
    skills: [],
  }) as unknown as Package;

const fakePackage = buildPackage('pkg-1', 'Security checks');

const renderModal = (
  overrides: { open?: boolean; selectedPackages?: Package[] } = {},
) => {
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
          selectedPackages={overrides.selectedPackages ?? [fakePackage]}
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

const successResponseFor = (packageId: string, pluginSlug: string) => ({
  marketplaceDistributionId: `md-${packageId}`,
  status: 'in_progress' as const,
  marketplaceId: fakeMarketplaceId,
  packageId: packageId as PackageId,
  pluginSlug,
});

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

  describe('when marketplaces are loaded', () => {
    it('renders the modal title', async () => {
      renderModal();

      expect(
        await screen.findByRole('heading', {
          name: 'Publish to a marketplace',
        }),
      ).toBeInTheDocument();
    });

    it('renders the modal subtitle', () => {
      renderModal();

      expect(
        screen.getByText(/Pick a linked marketplace/i),
      ).toBeInTheDocument();
    });

    it('renders the singular submit button label', () => {
      renderModal();

      expect(
        screen.getByRole('button', { name: 'Publish' }),
      ).toBeInTheDocument();
    });

    it('renders the marketplace name', () => {
      renderModal();

      expect(screen.getByText('Acme Playbook')).toBeInTheDocument();
    });
  });

  describe('when closed', () => {
    it('does not enter an infinite render loop (regression)', () => {
      // Use the REAL mutation hook so `publishMutation` gets a fresh object
      // identity on every render — the production condition. The shared stub
      // (`setMutation`) returns a stable object, so it never reproduced the
      // render → reset() → render loop that the `[open, publishMutation]`
      // dependency caused. Depending on the stable `reset` callback fixes it.
      const { useMarketplacePublishMutation: realPublishMutation } =
        jest.requireActual('../../api/queries/useMarketplacePublishMutation');
      mockedUseMarketplacePublishMutation.mockImplementation(() =>
        realPublishMutation(),
      );

      expect(() => renderModal({ open: false })).not.toThrow();
    });
  });

  describe('when no marketplaces are linked', () => {
    beforeEach(() => {
      mockedUseMarketplaces.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useMarketplaces>);
    });

    it('shows the empty state', async () => {
      renderModal();

      expect(
        await screen.findByText(/No marketplaces linked yet/i),
      ).toBeInTheDocument();
    });

    it('disables the submit button', () => {
      renderModal();

      expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    });
  });

  describe('when a single package succeeds', () => {
    const setup = () => {
      const mutateAsync = jest
        .fn()
        .mockResolvedValue(successResponseFor('pkg-1', 'security-checks'));
      setMutation({ mutateAsync });
      const { onOpenChange } = renderModal();
      return { mutateAsync, onOpenChange };
    };

    it('submits the publish mutation once', async () => {
      const { mutateAsync } = setup();

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
    });

    it('surfaces the single-package success toast', async () => {
      setup();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
      });

      await waitFor(() => {
        expect(successToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Publish started' }),
        );
      });
    });

    it('closes the modal', async () => {
      const { onOpenChange } = setup();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
      });

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('when a single-package publish fails with invalid token', () => {
    it('surfaces the verbatim invalid-token toast', async () => {
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
  });

  describe('when a single-package publish fails with a 409 name conflict', () => {
    it('surfaces the name-collision toast', async () => {
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
  });

  describe('when a single-package publish fails with a generic 400', () => {
    it('surfaces the descriptor-bad-format toast', async () => {
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

  describe('when multiple packages all succeed', () => {
    const pkgA = buildPackage('pkg-a', 'Alpha');
    const pkgB = buildPackage('pkg-b', 'Bravo');
    const pkgC = buildPackage('pkg-c', 'Charlie');

    const setup = () => {
      const mutateAsync = jest
        .fn()
        .mockResolvedValueOnce(successResponseFor('pkg-a', 'alpha'))
        .mockResolvedValueOnce(successResponseFor('pkg-b', 'bravo'))
        .mockResolvedValueOnce(successResponseFor('pkg-c', 'charlie'));
      setMutation({ mutateAsync });
      const { onOpenChange } = renderModal({
        selectedPackages: [pkgA, pkgB, pkgC],
      });
      return { mutateAsync, onOpenChange };
    };

    it('renders the plural submit label', () => {
      setMutation();
      renderModal({ selectedPackages: [pkgA, pkgB, pkgC] });

      expect(
        screen.getByRole('button', { name: 'Publish 3 packages' }),
      ).toBeInTheDocument();
    });

    it('fires one mutateAsync call per selected package', async () => {
      const { mutateAsync } = setup();

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Publish 3 packages' }),
        );
      });

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledTimes(3);
      });
    });

    it('surfaces the multi-success toast', async () => {
      setup();

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Publish 3 packages' }),
        );
      });

      await waitFor(() => {
        expect(successToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Publishing started',
            description: expect.stringContaining('3 packages to Acme Playbook'),
          }),
        );
      });
    });

    it('closes the modal', async () => {
      const { onOpenChange } = setup();

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Publish 3 packages' }),
        );
      });

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('when multiple packages partially fail', () => {
    const pkgA = buildPackage('pkg-a', 'Alpha');
    const pkgB = buildPackage('pkg-b', 'Bravo');
    const pkgC = buildPackage('pkg-c', 'Charlie');

    const setup = () => {
      const mutateAsync = jest
        .fn()
        .mockResolvedValueOnce(successResponseFor('pkg-a', 'alpha'))
        .mockRejectedValueOnce(
          new PackmindError(buildServerError(409, 'plugin name conflict')),
        )
        .mockRejectedValueOnce(
          new PackmindError(buildServerError(400, 'descriptor bad format')),
        );
      setMutation({ mutateAsync });
      const { onOpenChange } = renderModal({
        selectedPackages: [pkgA, pkgB, pkgC],
      });
      return { mutateAsync, onOpenChange };
    };

    it('surfaces a warning toast listing the failing package names', async () => {
      setup();

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Publish 3 packages' }),
        );
      });

      await waitFor(() => {
        expect(warningToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Some publishes failed',
            description: expect.stringContaining('“Bravo”, “Charlie”'),
          }),
        );
      });
    });

    it('still closes the modal', async () => {
      const { onOpenChange } = setup();

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Publish 3 packages' }),
        );
      });

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('when every multi-package publish fails', () => {
    const pkgA = buildPackage('pkg-a', 'Alpha');
    const pkgB = buildPackage('pkg-b', 'Bravo');

    const setup = () => {
      const mutateAsync = jest
        .fn()
        .mockRejectedValueOnce(
          new PackmindError(buildServerError(409, 'plugin name conflict')),
        )
        .mockRejectedValueOnce(
          new PackmindError(buildServerError(409, 'plugin name conflict')),
        );
      setMutation({ mutateAsync });
      const { onOpenChange } = renderModal({
        selectedPackages: [pkgA, pkgB],
      });
      return { mutateAsync, onOpenChange };
    };

    it('surfaces the all-failed error toast with the dominant reason', async () => {
      setup();

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Publish 2 packages' }),
        );
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

    it('keeps the modal open', async () => {
      const { onOpenChange } = setup();

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Publish 2 packages' }),
        );
      });

      await waitFor(() => {
        expect(errorToast).toHaveBeenCalled();
      });
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  describe('when a multi-package batch is in flight', () => {
    const pkgA = buildPackage('pkg-a', 'Alpha');
    const pkgB = buildPackage('pkg-b', 'Bravo');

    it('keeps the submit button disabled for the entire batch', async () => {
      // Two pending promises we resolve manually so we can observe the
      // disabled state mid-batch.
      let resolveA: (value: ReturnType<typeof successResponseFor>) => void =
        (() => undefined) as never;
      let resolveB: (value: ReturnType<typeof successResponseFor>) => void =
        (() => undefined) as never;
      const promiseA = new Promise<ReturnType<typeof successResponseFor>>(
        (resolve) => {
          resolveA = resolve;
        },
      );
      const promiseB = new Promise<ReturnType<typeof successResponseFor>>(
        (resolve) => {
          resolveB = resolve;
        },
      );
      const mutateAsync = jest
        .fn()
        .mockReturnValueOnce(promiseA)
        .mockReturnValueOnce(promiseB);
      setMutation({ mutateAsync });

      renderModal({ selectedPackages: [pkgA, pkgB] });

      const button = screen.getByRole('button', {
        name: 'Publish 2 packages',
      });

      await act(async () => {
        fireEvent.click(button);
      });

      // Both calls are in flight; the submit button must stay disabled even
      // though the mutation hook's own `isPending` flag would oscillate.
      // Chakra's loading-state button strips the spinner-wrapped text from
      // the accessible name, so query the visible text and walk up to the
      // owning button instead of relying on the role name.
      const loadingLabel = screen.getByText('Publishing 2 packages…');
      expect(loadingLabel.closest('button')).toBeDisabled();

      await act(async () => {
        resolveA(successResponseFor('pkg-a', 'alpha'));
        resolveB(successResponseFor('pkg-b', 'bravo'));
      });
    });
  });
});
