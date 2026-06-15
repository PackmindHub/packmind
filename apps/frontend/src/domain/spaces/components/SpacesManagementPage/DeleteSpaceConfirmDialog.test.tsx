import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider, pmToaster } from '@packmind/ui';
import { createSpaceId } from '@packmind/types';

import * as SpacesManagementQueriesModule from '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries';
import * as UseAuthContextModule from '../../../accounts/hooks/useAuthContext';
import { DeleteSpaceConfirmDialog } from './DeleteSpaceConfirmDialog';

jest.mock(
  '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
  () => ({
    ...jest.requireActual(
      '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
    ),
    useDeleteSpaceMutation: jest.fn(),
  }),
);

jest.mock('../../../accounts/hooks/useAuthContext', () => ({
  ...jest.requireActual('../../../accounts/hooks/useAuthContext'),
  useAuthContext: jest.fn(),
}));

jest.mock('@packmind/ui', () => ({
  ...jest.requireActual('@packmind/ui'),
  pmToaster: {
    create: jest.fn(),
  },
}));

const mockMutate = jest.fn();

const mockDeleteMutation = (overrides: Record<string, unknown> = {}) => {
  jest
    .spyOn(SpacesManagementQueriesModule, 'useDeleteSpaceMutation')
    .mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      ...overrides,
    } as unknown as ReturnType<
      typeof SpacesManagementQueriesModule.useDeleteSpaceMutation
    >);
};

const mockAuth = (organizationId: string | null = 'org-1') => {
  jest.spyOn(UseAuthContextModule, 'useAuthContext').mockReturnValue({
    organization: organizationId ? { id: organizationId } : null,
  } as unknown as ReturnType<typeof UseAuthContextModule.useAuthContext>);
};

const renderWithProviders = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <UIProvider>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </UIProvider>,
  );
};

const baseSpace = {
  id: createSpaceId('space-1'),
  name: 'Engineering',
};

describe('DeleteSpaceConfirmDialog', () => {
  beforeEach(() => {
    mockDeleteMutation();
    mockAuth();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockMutate.mockReset();
  });

  describe('when the dialog is open', () => {
    it('renders the confirmation copy with the space name', async () => {
      renderWithProviders(
        <DeleteSpaceConfirmDialog
          isOpen
          onClose={jest.fn()}
          space={baseSpace}
        />,
      );

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveTextContent(/Delete space/i);
      expect(dialog).toHaveTextContent(/Engineering/);
      expect(dialog).toHaveTextContent(/This action is irreversible\./);
    });

    it('renders the type-to-confirm input', async () => {
      renderWithProviders(
        <DeleteSpaceConfirmDialog
          isOpen
          onClose={jest.fn()}
          space={baseSpace}
        />,
      );

      expect(
        await screen.findByPlaceholderText('Enter space name'),
      ).toBeInTheDocument();
    });

    it('renders the Delete button as disabled by default', async () => {
      renderWithProviders(
        <DeleteSpaceConfirmDialog
          isOpen
          onClose={jest.fn()}
          space={baseSpace}
        />,
      );

      const deleteButton = await screen.findByRole('button', {
        name: 'Delete',
      });
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('when the user types a non-matching space name', () => {
    it('keeps the Delete button disabled', async () => {
      renderWithProviders(
        <DeleteSpaceConfirmDialog
          isOpen
          onClose={jest.fn()}
          space={baseSpace}
        />,
      );

      const input = await screen.findByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Wrong Name' } });

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    });
  });

  describe('when the user types the matching space name', () => {
    it('enables the Delete button', async () => {
      renderWithProviders(
        <DeleteSpaceConfirmDialog
          isOpen
          onClose={jest.fn()}
          space={baseSpace}
        />,
      );

      const input = await screen.findByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Engineering' } });

      expect(screen.getByRole('button', { name: 'Delete' })).not.toBeDisabled();
    });
  });

  describe('when the user clicks Cancel', () => {
    it('calls onClose without invoking the mutation', async () => {
      const onClose = jest.fn();

      renderWithProviders(
        <DeleteSpaceConfirmDialog isOpen onClose={onClose} space={baseSpace} />,
      );

      const cancelButton = await screen.findByRole('button', {
        name: /cancel/i,
      });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('when the user confirms deletion and the mutation succeeds', () => {
    it('shows a success toast and closes the dialog', async () => {
      mockMutate.mockImplementation(
        (
          _params: unknown,
          options: {
            onSuccess?: () => void | Promise<void>;
            onError?: () => void;
          },
        ) => {
          options.onSuccess?.();
        },
      );
      const onClose = jest.fn();

      renderWithProviders(
        <DeleteSpaceConfirmDialog isOpen onClose={onClose} space={baseSpace} />,
      );

      const input = await screen.findByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Engineering' } });

      const deleteButton = await screen.findByRole('button', {
        name: 'Delete',
      });
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(mockMutate).toHaveBeenCalledWith(
        { spaceId: baseSpace.id },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
      expect(pmToaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: `Space 'Engineering' deleted`,
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('when the user confirms deletion and the mutation fails', () => {
    it('shows an error toast and keeps the dialog open', async () => {
      mockMutate.mockImplementation(
        (
          _params: unknown,
          options: { onSuccess?: () => void; onError?: () => void },
        ) => {
          options.onError?.();
        },
      );
      const onClose = jest.fn();

      renderWithProviders(
        <DeleteSpaceConfirmDialog isOpen onClose={onClose} space={baseSpace} />,
      );

      const input = await screen.findByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Engineering' } });

      const deleteButton = await screen.findByRole('button', {
        name: 'Delete',
      });
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(pmToaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Failed to delete space',
        }),
      );
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
