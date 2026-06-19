import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider, pmToaster } from '@packmind/ui';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  Space,
  SpaceType,
  type UserOrganizationRole,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';

import * as SpacesManagementQueriesModule from '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries';
import * as UseAuthContextModule from '../../accounts/hooks/useAuthContext';
import { SpaceIdentitySection } from './SpaceIdentitySection';

jest.mock(
  '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
  () => ({
    ...jest.requireActual(
      '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
    ),
    useUpdateSpaceMutation: jest.fn(),
  }),
);

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

const mockMutateAsync = jest.fn();

const mockUpdateSpaceMutation = (
  overrides: Partial<{ isPending: boolean }> = {},
) => {
  jest
    .spyOn(SpacesManagementQueriesModule, 'useUpdateSpaceMutation')
    .mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      ...overrides,
    } as unknown as ReturnType<
      typeof SpacesManagementQueriesModule.useUpdateSpaceMutation
    >);
};

const organizationId = createOrganizationId('org-1');

const mockAuth = (
  overrides: Partial<{
    organization: { id: ReturnType<typeof createOrganizationId> } | undefined;
  }> = {},
) => {
  jest.spyOn(UseAuthContextModule, 'useAuthContext').mockReturnValue({
    organization:
      'organization' in overrides
        ? overrides.organization
        : {
            id: organizationId,
            name: 'Org 1',
            slug: 'org-1',
            role: 'admin' as UserOrganizationRole,
          },
    user: {
      id: createUserId('user-1'),
      email: 'user@test.com',
      displayName: null,
      memberships: [],
    },
    isAuthenticated: true,
    isLoading: false,
    getMe: jest.fn(),
    getUserOrganizations: jest.fn(),
    validateAndSwitchIfNeeded: jest.fn(),
  } as unknown as ReturnType<typeof UseAuthContextModule.useAuthContext>);
};

const buildSpace = (overrides: Partial<Space> = {}): Space =>
  spaceFactory({
    id: createSpaceId('space-1'),
    name: 'Test Space',
    slug: 'test-space',
    type: SpaceType.open,
    organizationId,
    isDefaultSpace: false,
    ...overrides,
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const utils = render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </UIProvider>,
  );
  return { ...utils, queryClient, invalidateSpy };
};

describe('SpaceIdentitySection', () => {
  beforeEach(() => {
    mockUpdateSpaceMutation();
    mockAuth();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockReset();
  });

  describe('when the user saves a name change', () => {
    it('invalidates the spaces management listing key on success', async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      const space = buildSpace({ name: 'Original Name' });

      const { invalidateSpy } = renderWithProviders(
        <SpaceIdentitySection space={space} canEdit={true} />,
      );

      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'New Name' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          spaceId: space.id,
          fields: { name: 'New Name' },
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['organizations', organizationId, 'spaces', 'management'],
        });
      });
    });

    it('shows a success toaster when the update succeeds', async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      const space = buildSpace({ name: 'Original Name' });

      renderWithProviders(
        <SpaceIdentitySection space={space} canEdit={true} />,
      );

      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'New Name' } });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(pmToaster.create).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' }),
        );
      });
    });
  });

  describe('when the update fails', () => {
    it('does not invalidate the management listing key', async () => {
      mockMutateAsync.mockRejectedValue(new Error('boom'));
      const space = buildSpace({ name: 'Original Name' });

      const { invalidateSpy } = renderWithProviders(
        <SpaceIdentitySection space={space} canEdit={true} />,
      );

      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'New Name' } });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(pmToaster.create).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' }),
        );
      });

      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: ['organizations', organizationId, 'spaces', 'management'],
      });
    });
  });

  describe('when there is no organization in context', () => {
    it('does not invalidate the management listing key', async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      mockAuth({ organization: undefined });
      const space = buildSpace({ name: 'Original Name' });

      const { invalidateSpy } = renderWithProviders(
        <SpaceIdentitySection space={space} canEdit={true} />,
      );

      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'New Name' } });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: expect.arrayContaining(['management']),
      });
    });
  });
});
