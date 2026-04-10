import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { SpaceType, createPackageId, createSpaceId } from '@packmind/types';

import * as UseCurrentSpaceModule from '../hooks/useCurrentSpace';
import * as SpacesManagementQueriesModule from '../../spaces-management/api/queries/SpacesManagementQueries';
import * as DeploymentsQueriesModule from '../../deployments/api/queries/DeploymentsQueries';
import * as UseNavigationModule from '../../../shared/hooks/useNavigation';
import * as UseAuthContextModule from '../../accounts/hooks/useAuthContext';
import { SpaceDangerZoneSection } from './SpaceDangerZoneSection';

jest.mock('../hooks/useCurrentSpace', () => ({
  ...jest.requireActual('../hooks/useCurrentSpace'),
  useCurrentSpace: jest.fn(),
}));

jest.mock(
  '../../spaces-management/api/queries/SpacesManagementQueries',
  () => ({
    ...jest.requireActual(
      '../../spaces-management/api/queries/SpacesManagementQueries',
    ),
    useLeaveSpaceMutation: jest.fn(),
    useDeleteSpaceMutation: jest.fn(),
  }),
);

jest.mock('../../deployments/api/queries/DeploymentsQueries', () => ({
  ...jest.requireActual('../../deployments/api/queries/DeploymentsQueries'),
  useListPackagesBySpaceQuery: jest.fn(),
}));

jest.mock('../../../shared/hooks/useNavigation', () => ({
  ...jest.requireActual('../../../shared/hooks/useNavigation'),
  useNavigation: jest.fn(),
}));

jest.mock('../../accounts/hooks/useAuthContext', () => ({
  ...jest.requireActual('../../accounts/hooks/useAuthContext'),
  useAuthContext: jest.fn(),
}));
const mockUseCurrentSpace = (
  overrides: Partial<ReturnType<typeof UseCurrentSpaceModule.useCurrentSpace>>,
) => {
  jest.spyOn(UseCurrentSpaceModule, 'useCurrentSpace').mockReturnValue({
    spaceId: 'space-1',
    spaceSlug: 'test-space',
    spaceName: 'Test Space',
    space: {
      id: 'space-1',
      name: 'Test Space',
      slug: 'test-space',
      type: SpaceType.open,
      organizationId: 'org-1',
      isDefaultSpace: false,
    },
    isLoading: false,
    error: null,
    isReady: true,
    ...overrides,
  } as unknown as ReturnType<typeof UseCurrentSpaceModule.useCurrentSpace>);
};

const mockMutate = jest.fn();

const mockLeaveSpaceMutation = () => {
  jest
    .spyOn(SpacesManagementQueriesModule, 'useLeaveSpaceMutation')
    .mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<
      typeof SpacesManagementQueriesModule.useLeaveSpaceMutation
    >);
};

const mockDeleteSpaceMutation = () => {
  jest
    .spyOn(SpacesManagementQueriesModule, 'useDeleteSpaceMutation')
    .mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<
      typeof SpacesManagementQueriesModule.useDeleteSpaceMutation
    >);
};

const mockListPackagesBySpaceQuery = (
  packages: { id: string; name: string }[] = [],
) => {
  jest
    .spyOn(DeploymentsQueriesModule, 'useListPackagesBySpaceQuery')
    .mockReturnValue({
      data: { packages },
    } as unknown as ReturnType<
      typeof DeploymentsQueriesModule.useListPackagesBySpaceQuery
    >);
};

const mockToDashboard = jest.fn();

const mockNavigation = () => {
  jest.spyOn(UseNavigationModule, 'useNavigation').mockReturnValue({
    org: { toDashboard: mockToDashboard },
  } as unknown as ReturnType<typeof UseNavigationModule.useNavigation>);
};

const mockAuth = () => {
  jest.spyOn(UseAuthContextModule, 'useAuthContext').mockReturnValue({
    organization: { id: 'org-1', slug: 'org-slug' },
  } as unknown as ReturnType<typeof UseAuthContextModule.useAuthContext>);
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

describe('SpaceDangerZoneSection', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockMutate.mockReset();
  });

  beforeEach(() => {
    mockUseCurrentSpace({});
    mockLeaveSpaceMutation();
    mockDeleteSpaceMutation();
    mockListPackagesBySpaceQuery();
    mockNavigation();
    mockAuth();
  });

  describe('when the space is the default space', () => {
    beforeEach(() => {
      mockUseCurrentSpace({
        space: {
          id: 'space-1',
          name: 'Default Space',
          slug: 'default-space',
          type: SpaceType.open,
          organizationId: 'org-1',
          isDefaultSpace: true,
        },
      });
    });

    it('does not render the leave button', () => {
      renderWithProviders(<SpaceDangerZoneSection />);

      expect(
        screen.queryByRole('button', { name: /leave this space/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the leave dialog is opened', () => {
    const openLeaveDialog = () => {
      renderWithProviders(<SpaceDangerZoneSection />);
      const trigger = screen.getByRole('button', {
        name: /leave this space/i,
      });
      fireEvent.click(trigger);
    };

    beforeEach(() => {
      openLeaveDialog();
    });

    it('renders the confirmation input prompt', () => {
      expect(
        screen.getByPlaceholderText('Enter space name'),
      ).toBeInTheDocument();
    });

    it('renders the leave button as disabled', () => {
      const leaveButton = screen.getByRole('button', { name: 'Leave' });

      expect(leaveButton).toBeDisabled();
    });

    describe('when the user types a wrong space name', () => {
      it('keeps the leave button disabled', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Wrong Name' } });

        const leaveButton = screen.getByRole('button', { name: 'Leave' });

        expect(leaveButton).toBeDisabled();
      });
    });

    describe('when the user types the correct space name', () => {
      it('enables the leave button', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Test Space' } });

        const leaveButton = screen.getByRole('button', { name: 'Leave' });

        expect(leaveButton).not.toBeDisabled();
      });

      describe('when the user confirms leaving', () => {
        it('calls the leave space mutation with the space ID', () => {
          const input = screen.getByPlaceholderText('Enter space name');
          fireEvent.change(input, { target: { value: 'Test Space' } });

          const leaveButton = screen.getByRole('button', { name: 'Leave' });
          fireEvent.click(leaveButton);

          expect(mockMutate).toHaveBeenCalledWith({ spaceId: 'space-1' });
        });
      });
    });

    describe('when the user types the space name with different casing', () => {
      it('keeps the leave button disabled', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'test space' } });

        const leaveButton = screen.getByRole('button', { name: 'Leave' });

        expect(leaveButton).toBeDisabled();
      });
    });
  });

  describe('when the delete dialog is opened', () => {
    const openDeleteDialog = () => {
      renderWithProviders(<SpaceDangerZoneSection />);
      const trigger = screen.getByRole('button', {
        name: /delete this space/i,
      });
      fireEvent.click(trigger);
    };

    beforeEach(() => {
      openDeleteDialog();
    });

    it('renders the confirmation input prompt', () => {
      expect(
        screen.getByPlaceholderText('Enter space name'),
      ).toBeInTheDocument();
    });

    it('renders the delete button as disabled', () => {
      const deleteButton = screen.getByRole('button', { name: 'Delete' });

      expect(deleteButton).toBeDisabled();
    });

    describe('when the user types a wrong space name', () => {
      it('keeps the delete button disabled', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Wrong Name' } });

        const deleteButton = screen.getByRole('button', { name: 'Delete' });

        expect(deleteButton).toBeDisabled();
      });
    });

    describe('when the user types the correct space name', () => {
      it('enables the delete button', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Test Space' } });

        const deleteButton = screen.getByRole('button', { name: 'Delete' });

        expect(deleteButton).not.toBeDisabled();
      });
    });

    describe('when the user types the space name with different casing', () => {
      it('keeps the delete button disabled', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'test space' } });

        const deleteButton = screen.getByRole('button', { name: 'Delete' });

        expect(deleteButton).toBeDisabled();
      });
    });

    describe('when the user confirms deletion', () => {
      it('calls the delete mutation with the correct space id', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Test Space' } });

        const deleteButton = screen.getByRole('button', { name: 'Delete' });
        fireEvent.click(deleteButton);

        expect(mockMutate).toHaveBeenCalledWith(
          { spaceId: 'space-1' },
          expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
      });
    });
  });

  describe('when the delete dialog is opened with impacted packages', () => {
    beforeEach(() => {
      mockListPackagesBySpaceQuery([
        {
          id: createPackageId('pkg-1'),
          name: '@test/my-package',
        },
        {
          id: createPackageId('pkg-2'),
          name: '@test/other-package',
        },
      ]);
      renderWithProviders(<SpaceDangerZoneSection />);
      const trigger = screen.getByRole('button', {
        name: /delete this space/i,
      });
      fireEvent.click(trigger);
    });

    it('displays the impacted package names', () => {
      expect(screen.getByText('- @test/my-package')).toBeInTheDocument();
    });
  });

  describe('when the space is the default space', () => {
    beforeEach(() => {
      mockUseCurrentSpace({
        space: {
          id: createSpaceId('space-1'),
          name: 'Default Space',
          slug: 'default-space',
          type: SpaceType.open,
          organizationId: 'org-1',
          isDefaultSpace: true,
        },
      });
    });

    it('does not render the delete button', () => {
      renderWithProviders(<SpaceDangerZoneSection />);

      expect(
        screen.queryByRole('button', { name: /delete this space/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the space is not the default space', () => {
    beforeEach(() => {
      mockUseCurrentSpace({
        space: {
          id: createSpaceId('space-1'),
          name: 'Test Space',
          slug: 'test-space',
          type: SpaceType.open,
          organizationId: 'org-1',
          isDefaultSpace: false,
        },
      });
    });

    it('renders the delete button', () => {
      renderWithProviders(<SpaceDangerZoneSection />);

      expect(
        screen.getByRole('button', { name: /delete this space/i }),
      ).toBeInTheDocument();
    });
  });
});
