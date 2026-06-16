import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Package, PackageId, SpaceId } from '@packmind/types';
import { DeployPackageButton } from './DeployPackageButton';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';

jest.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: jest.fn(),
}));

// The Distribute > "To code repositories" path embeds the existing
// RunDistribution composition which itself fans out to a bunch of TanStack
// queries (targets, providers, render-mode config…). We don't exercise that
// modal here — task 3.3 only cares about the menu surface and its feature-
// flag gate, so we stub it to a marker element.
jest.mock('../RunDistribution/RunDistribution', () => ({
  RunDistribution: Object.assign(() => <div data-testid="run-distribution" />, {
    Body: () => null,
    Cta: () => null,
  }),
}));

jest.mock('../RunMarketplacePublish/RunMarketplacePublish', () => ({
  RunMarketplacePublish: ({ open }: { open: boolean }) =>
    open ? <div data-testid="run-marketplace-publish" /> : null,
}));

const mockedUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;

const fakePackage: Package = {
  id: 'pkg-1' as PackageId,
  spaceId: 'space-1' as SpaceId,
  slug: 'pkg-1',
  name: 'Pkg 1',
  description: '',
  recipes: [],
  standards: [],
  skills: [],
  // Created/updated timestamps below are not consumed by the button — these
  // are filler values so the type-checker is happy in test fixtures.
} as unknown as Package;

const renderButton = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        <DeployPackageButton selectedPackages={[fakePackage]} />
      </QueryClientProvider>
    </UIProvider>,
  );
};

describe('DeployPackageButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the marketplace feature flag is off', () => {
    beforeEach(() => {
      mockedUseAuthContext.mockReturnValue({
        user: { id: 'u-1', email: 'someone@example.com' },
      } as unknown as ReturnType<typeof useAuthContext>);
    });

    it('renders the historical single-button entry without the marketplace channel', () => {
      renderButton();

      // The standalone trigger button is rendered and visible.
      expect(
        screen.getByRole('button', { name: 'Distribute' }),
      ).toBeInTheDocument();

      // No menu options are exposed when the flag is off.
      expect(
        screen.queryByRole('menuitem', { name: 'To code repositories' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: 'To marketplaces' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the marketplace feature flag is on', () => {
    beforeEach(() => {
      mockedUseAuthContext.mockReturnValue({
        user: { id: 'u-1', email: 'someone@packmind.com' },
      } as unknown as ReturnType<typeof useAuthContext>);
    });

    it('exposes both menu entries on click', async () => {
      renderButton();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Distribute/ }));
      });

      // Chakra Menu renders items only after open; using findByText avoids
      // role-locator brittleness across PM/Chakra versions.
      expect(
        await screen.findByText('To code repositories'),
      ).toBeInTheDocument();
      expect(await screen.findByText('To marketplaces')).toBeInTheDocument();
    });

    it('opens the marketplace publish modal when the second entry is clicked', async () => {
      renderButton();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Distribute/ }));
      });

      const marketplaceItem = await screen.findByText('To marketplaces');
      await act(async () => {
        fireEvent.click(marketplaceItem);
      });

      expect(
        await screen.findByTestId('run-marketplace-publish'),
      ).toBeInTheDocument();
    });
  });
});
