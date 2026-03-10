import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CardActions } from './CardActions';
import { ChangeProposalType } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks';
import { useListPackagesBySpaceQuery } from '../../../deployments/api/queries/DeploymentsQueries';

jest.mock('../../../accounts/hooks');
jest.mock('../../../deployments/api/queries/DeploymentsQueries');

const mockedUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;
const mockedUseListPackagesBySpaceQuery =
  useListPackagesBySpaceQuery as jest.MockedFunction<
    typeof useListPackagesBySpaceQuery
  >;

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </UIProvider>,
  );
};

const defaultProps = {
  poolStatus: 'pending' as const,
  proposalType: ChangeProposalType.removeStandard,
  packageIds: ['pkg-1', 'pkg-2'],
  spaceId: 'space-1',
  isOutdated: false,
  isBlockedByConflict: false,
  onEdit: jest.fn(),
  onAccept: jest.fn(),
  onDismiss: jest.fn(),
  onUndo: jest.fn(),
};

describe('CardActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuthContext.mockReturnValue({
      organization: { id: 'org-1', slug: 'test-org' },
    } as ReturnType<typeof useAuthContext>);
    mockedUseListPackagesBySpaceQuery.mockReturnValue({
      data: {
        packages: [
          { id: 'pkg-1', name: 'Package One' },
          { id: 'pkg-2', name: 'Package Two' },
        ],
      },
    } as unknown as ReturnType<typeof useListPackagesBySpaceQuery>);
  });

  describe('ResolveButton for remove proposals', () => {
    describe('when clicking Resolve menu', () => {
      it('displays the Delete artefact menu item', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CardActions {...defaultProps} />);

        await user.click(screen.getByText('Resolve'));

        expect(screen.getByText('Delete artefact')).toBeInTheDocument();
      });
    });

    describe('when clicking Delete artefact', () => {
      it('opens a confirmation dialog', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CardActions {...defaultProps} />);

        await user.click(screen.getByText('Resolve'));
        await user.click(screen.getByText('Delete artefact'));

        expect(screen.getByText(/permanently deleted/)).toBeInTheDocument();
      });
    });

    describe('when confirming deletion', () => {
      it('calls onAccept with delete true', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CardActions {...defaultProps} />);

        await user.click(screen.getByText('Resolve'));
        await user.click(screen.getByText('Delete artefact'));
        await user.click(screen.getByRole('button', { name: /confirm/i }));

        expect(defaultProps.onAccept).toHaveBeenCalledWith({ delete: true });
      });
    });

    describe('when cancelling deletion', () => {
      it('closes the confirmation dialog without calling onAccept', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CardActions {...defaultProps} />);

        await user.click(screen.getByText('Resolve'));
        await user.click(screen.getByText('Delete artefact'));
        await user.click(screen.getByRole('button', { name: /cancel/i }));

        expect(defaultProps.onAccept).not.toHaveBeenCalled();
      });
    });
  });
});
