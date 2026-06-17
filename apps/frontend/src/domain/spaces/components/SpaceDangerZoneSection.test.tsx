import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider, pmToaster } from '@packmind/ui';
import {
  Space,
  SpaceType,
  createOrganizationId,
  createPackageId,
  createSpaceId,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';

import * as SpacesManagementQueriesModule from '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries';
import * as DeploymentsQueriesModule from '../../deployments/api/queries/DeploymentsQueries';
import * as UseNavigationModule from '../../../shared/hooks/useNavigation';
import * as UseAuthContextModule from '../../accounts/hooks/useAuthContext';
import { SpaceDangerZoneSection } from './SpaceDangerZoneSection';

jest.mock(
  '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
  () => ({
    ...jest.requireActual(
      '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
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

jest.mock('@packmind/ui', () => ({
  ...jest.requireActual('@packmind/ui'),
  pmToaster: {
    create: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockMutate = jest.fn();
const mockLeaveMutate = jest.fn();
const mockToDashboard = jest.fn();

const mockLeaveSpaceMutation = () => {
  jest
    .spyOn(SpacesManagementQueriesModule, 'useLeaveSpaceMutation')
    .mockReturnValue({
      mutate: mockLeaveMutate,
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

const mockNavigation = () => {
  jest.spyOn(UseNavigationModule, 'useNavigation').mockReturnValue({
    org: { toDashboard: mockToDashboard },
  } as unknown as ReturnType<typeof UseNavigationModule.useNavigation>);
};

const mockAuth = () => {
  jest.spyOn(UseAuthContextModule, 'useAuthContext').mockReturnValue({
    organization: { id: createOrganizationId('org-1'), slug: 'org-slug' },
  } as unknown as ReturnType<typeof UseAuthContextModule.useAuthContext>);
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

const buildSpace = (overrides: Partial<Space> = {}): Space =>
  spaceFactory({
    id: createSpaceId('space-1'),
    name: 'Test Space',
    slug: 'test-space',
    type: SpaceType.open,
    organizationId: createOrganizationId('org-1'),
    isDefaultSpace: false,
    ...overrides,
  });

describe('SpaceDangerZoneSection', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockMutate.mockReset();
    mockLeaveMutate.mockReset();
    mockToDashboard.mockReset();
  });

  beforeEach(() => {
    mockLeaveSpaceMutation();
    mockDeleteSpaceMutation();
    mockListPackagesBySpaceQuery();
    mockNavigation();
    mockAuth();
  });

  describe('when the space is the default space', () => {
    it('does not render the leave button', () => {
      const space = buildSpace({ isDefaultSpace: true });

      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );

      expect(
        screen.queryByRole('button', { name: /leave this space/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render the delete button', () => {
      const space = buildSpace({ isDefaultSpace: true });

      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );

      expect(
        screen.queryByRole('button', { name: /delete this space/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the space is open', () => {
    it('shows the rejoin-anytime message in the danger zone description', () => {
      const space = buildSpace({ type: SpaceType.open });

      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );

      expect(
        screen.getByText(/You can rejoin whenever you want\./),
      ).toBeInTheDocument();
    });

    it('shows the rejoin-anytime message in the leave confirmation dialog', async () => {
      const space = buildSpace({ type: SpaceType.open });

      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );
      const trigger = screen.getByRole('button', {
        name: /leave this space/i,
      });
      await act(async () => {
        fireEvent.click(trigger);
      });
      const dialog = await screen.findByRole('dialog');

      expect(
        within(dialog).getByText(/You can rejoin whenever you want\./),
      ).toBeInTheDocument();
    });
  });

  describe('when the space is restricted', () => {
    it('shows the ask-administrator message in the danger zone description', () => {
      const space = buildSpace({ type: SpaceType.restricted });

      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );

      expect(
        screen.getByText(/You'll have to ask an administrator to rejoin\./),
      ).toBeInTheDocument();
    });

    it('shows the ask-administrator message in the leave confirmation dialog', async () => {
      const space = buildSpace({ type: SpaceType.restricted });

      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );
      const trigger = screen.getByRole('button', {
        name: /leave this space/i,
      });
      await act(async () => {
        fireEvent.click(trigger);
      });
      const dialog = await screen.findByRole('dialog');

      expect(
        within(dialog).getByText(
          /You'll have to ask an administrator to rejoin\./,
        ),
      ).toBeInTheDocument();
    });
  });

  describe('when the space is private', () => {
    it('shows the ask-administrator message in the danger zone description', () => {
      const space = buildSpace({ type: SpaceType.private });

      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );

      expect(
        screen.getByText(/You'll have to ask an administrator to rejoin\./),
      ).toBeInTheDocument();
    });
  });

  describe('when the leave dialog is opened', () => {
    const openLeaveDialog = async () => {
      const space = buildSpace();
      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );
      const trigger = screen.getByRole('button', {
        name: /leave this space/i,
      });
      await act(async () => {
        fireEvent.click(trigger);
      });
      await screen.findByPlaceholderText('Enter space name');
    };

    beforeEach(async () => {
      await openLeaveDialog();
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
        it('calls the leave space mutation with the space ID and lifecycle callbacks', () => {
          const input = screen.getByPlaceholderText('Enter space name');
          fireEvent.change(input, { target: { value: 'Test Space' } });

          const leaveButton = screen.getByRole('button', { name: 'Leave' });
          fireEvent.click(leaveButton);

          expect(mockLeaveMutate).toHaveBeenCalledWith(
            { spaceId: createSpaceId('space-1') },
            expect.objectContaining({
              onSuccess: expect.any(Function),
              onError: expect.any(Function),
            }),
          );
        });
      });

      describe('when the user submits the confirmation with the Enter key', () => {
        it('calls the leave space mutation with the space ID and lifecycle callbacks', () => {
          const input = screen.getByPlaceholderText('Enter space name');
          fireEvent.change(input, { target: { value: 'Test Space' } });

          const form = input.closest('form');
          if (!form) {
            throw new Error(
              'Expected the confirmation input to be inside a form',
            );
          }
          fireEvent.submit(form);

          expect(mockLeaveMutate).toHaveBeenCalledWith(
            { spaceId: createSpaceId('space-1') },
            expect.objectContaining({
              onSuccess: expect.any(Function),
              onError: expect.any(Function),
            }),
          );
        });
      });

      describe('when the user submits the confirmation with the Enter key but the space name is wrong', () => {
        it('does not call the leave space mutation', () => {
          const input = screen.getByPlaceholderText('Enter space name');
          fireEvent.change(input, { target: { value: 'Wrong Name' } });

          const form = input.closest('form');
          if (!form) {
            throw new Error(
              'Expected the confirmation input to be inside a form',
            );
          }
          fireEvent.submit(form);

          expect(mockLeaveMutate).not.toHaveBeenCalled();
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

  describe('when the user clicks Leave with a slow mutation', () => {
    const openDialogAndConfirm = async () => {
      mockLeaveMutate.mockImplementation(() => {
        // Simulate a slow mutation: do not invoke any callbacks
      });

      const space = buildSpace();
      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );
      const trigger = screen.getByRole('button', {
        name: /leave this space/i,
      });
      await act(async () => {
        fireEvent.click(trigger);
      });
      await screen.findByPlaceholderText('Enter space name');
      const input = screen.getByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Test Space' } });
      const dialog = screen.getByRole('dialog');
      const leaveButton = within(dialog).getByRole('button', { name: 'Leave' });
      await act(async () => {
        fireEvent.click(leaveButton);
      });
      return dialog;
    };

    it('immediately disables the leave action button before the mutation resolves', async () => {
      const dialog = await openDialogAndConfirm();

      const leaveActionButton = within(dialog).getAllByRole('button', {
        hidden: true,
      })[1];
      expect(leaveActionButton).toBeDisabled();
    });

    it('immediately disables the cancel button before the mutation resolves', async () => {
      const dialog = await openDialogAndConfirm();

      const cancelButton = within(dialog).getByRole('button', {
        name: 'Cancel',
      });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('when the leave mutation succeeds', () => {
    it('shows a success toaster naming the left space', async () => {
      mockLeaveMutate.mockImplementation(
        (
          _params: unknown,
          options: { onSuccess?: () => void; onError?: () => void },
        ) => {
          options.onSuccess?.();
        },
      );

      const space = buildSpace();
      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );
      const trigger = screen.getByRole('button', {
        name: /leave this space/i,
      });
      await act(async () => {
        fireEvent.click(trigger);
      });
      await screen.findByPlaceholderText('Enter space name');
      const input = screen.getByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Test Space' } });
      const leaveButton = screen.getByRole('button', { name: 'Leave' });
      await act(async () => {
        fireEvent.click(leaveButton);
      });

      expect(pmToaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          description: expect.stringContaining('Test Space'),
        }),
      );
    });
  });

  describe('when the leave mutation fails', () => {
    it('shows an error toaster', async () => {
      mockLeaveMutate.mockImplementation(
        (
          _params: unknown,
          options: { onSuccess?: () => void; onError?: () => void },
        ) => {
          options.onError?.();
        },
      );

      const space = buildSpace();
      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );
      const trigger = screen.getByRole('button', {
        name: /leave this space/i,
      });
      await act(async () => {
        fireEvent.click(trigger);
      });
      await screen.findByPlaceholderText('Enter space name');
      const input = screen.getByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Test Space' } });
      const leaveButton = screen.getByRole('button', { name: 'Leave' });
      await act(async () => {
        fireEvent.click(leaveButton);
      });

      expect(pmToaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Failed to leave space',
        }),
      );
    });
  });

  describe('when canDelete is true', () => {
    it('renders the delete button enabled', () => {
      const space = buildSpace();

      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );

      expect(
        screen.getByRole('button', { name: /delete this space/i }),
      ).toBeEnabled();
    });
  });

  describe('when canDelete is false', () => {
    it('disables the delete button', () => {
      const space = buildSpace();

      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={false} />,
      );

      expect(
        screen.getByRole('button', { name: /delete this space/i }),
      ).toBeDisabled();
    });

    it('still renders the leave button', () => {
      const space = buildSpace();

      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={false} />,
      );

      expect(
        screen.getByRole('button', { name: /leave this space/i }),
      ).toBeInTheDocument();
    });
  });

  describe('when the delete dialog is opened', () => {
    const openDeleteDialog = async () => {
      const space = buildSpace();
      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );
      const trigger = screen.getByRole('button', {
        name: /delete this space/i,
      });
      await act(async () => {
        fireEvent.click(trigger);
      });
      await screen.findByPlaceholderText('Enter space name');
    };

    beforeEach(async () => {
      await openDeleteDialog();
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
          { spaceId: createSpaceId('space-1') },
          expect.objectContaining({
            onSuccess: expect.any(Function),
            onError: expect.any(Function),
          }),
        );
      });
    });

    describe('when the user submits the confirmation with the Enter key', () => {
      it('calls the delete mutation with the correct space id', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Test Space' } });

        const form = input.closest('form');
        if (!form) {
          throw new Error(
            'Expected the confirmation input to be inside a form',
          );
        }
        fireEvent.submit(form);

        expect(mockMutate).toHaveBeenCalledWith(
          { spaceId: createSpaceId('space-1') },
          expect.objectContaining({
            onSuccess: expect.any(Function),
            onError: expect.any(Function),
          }),
        );
      });
    });

    describe('when the user submits the confirmation with the Enter key but the space name is wrong', () => {
      it('does not call the delete mutation', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Wrong Name' } });

        const form = input.closest('form');
        if (!form) {
          throw new Error(
            'Expected the confirmation input to be inside a form',
          );
        }
        fireEvent.submit(form);

        expect(mockMutate).not.toHaveBeenCalled();
      });
    });
  });

  describe('when the delete dialog is opened with impacted packages', () => {
    beforeEach(async () => {
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
      const space = buildSpace();
      renderWithProviders(
        <SpaceDangerZoneSection space={space} canDelete={true} />,
      );
      const trigger = screen.getByRole('button', {
        name: /delete this space/i,
      });
      await act(async () => {
        fireEvent.click(trigger);
      });
      await screen.findByPlaceholderText('Enter space name');
    });

    it('displays the impacted package names', () => {
      expect(screen.getByText('- @test/my-package')).toBeInTheDocument();
    });
  });

  describe('when the delete mutation succeeds', () => {
    const triggerDeleteSuccess = async (
      onDeleted?: () => void,
    ): Promise<void> => {
      mockMutate.mockImplementation(
        (
          _params: unknown,
          options: { onSuccess?: () => void; onError?: () => void },
        ) => {
          options.onSuccess?.();
        },
      );

      const space = buildSpace();
      renderWithProviders(
        <SpaceDangerZoneSection
          space={space}
          canDelete={true}
          onDeleted={onDeleted}
        />,
      );
      const trigger = screen.getByRole('button', {
        name: /delete this space/i,
      });
      await act(async () => {
        fireEvent.click(trigger);
      });
      await screen.findByPlaceholderText('Enter space name');
      const input = screen.getByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Test Space' } });
      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      await act(async () => {
        fireEvent.click(deleteButton);
      });
    };

    describe('when no onDeleted callback is provided', () => {
      it('redirects to the organization dashboard', async () => {
        await triggerDeleteSuccess();

        expect(mockToDashboard).toHaveBeenCalled();
      });
    });

    describe('when an onDeleted callback is provided', () => {
      it('calls onDeleted instead of redirecting', async () => {
        const onDeleted = jest.fn();

        await triggerDeleteSuccess(onDeleted);

        expect(onDeleted).toHaveBeenCalled();
        expect(mockToDashboard).not.toHaveBeenCalled();
      });
    });
  });
});
