import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { CliAuthentication } from './CliAuthentication';
import * as AuthContextModule from '../../accounts/hooks/useAuthContext';
import {
  useGetCurrentApiKeyQuery,
  useGenerateApiKeyMutation,
} from '../api/queries/AuthQueries';
import type {
  UserId,
  OrganizationId,
  UserOrganizationRole,
  GenerateApiKeyResponse,
  GetCurrentApiKeyResponse,
} from '@packmind/types';
import { CliAuthenticationDataTestIds } from '@packmind/frontend';
import type { MockedFunction } from 'vitest';
import {
  createIdleMutationResult,
  createSuccessMutationResult,
} from '../../../test/mutationResultMocks';
import { createSuccessQueryResult } from '../../../test/queryResultMocks';

vi.mock('../api/queries/AuthQueries', () => ({
  useGetCurrentApiKeyQuery: vi.fn(),
  useGenerateApiKeyMutation: vi.fn(),
}));

vi.mock('../../../shared/components/inputs', () => ({
  CopiableTextarea: ({
    value,
    ...props
  }: {
    value: string;
    [key: string]: unknown;
  }) => <textarea value={value} readOnly {...props} />,
  CopiableTextField: ({
    value,
    ...props
  }: {
    value: string;
    [key: string]: unknown;
  }) => <input value={value} readOnly {...props} />,
}));

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </UIProvider>,
  );
};

describe('CliAuthentication', () => {
  const userRole: UserOrganizationRole = 'admin';

  const mockUser = {
    id: 'user-1' as UserId,
    email: 'testuser@packmind.com',
    displayName: null,
    passwordHash: null,
    active: true,
    memberships: [
      {
        userId: 'user-1' as UserId,
        organizationId: 'org-1' as OrganizationId,
        role: userRole,
      },
    ],
  };

  const mockOrganization = {
    id: 'org-1' as OrganizationId,
    name: 'Test Organization',
    slug: 'test-organization',
    role: userRole,
  };

  beforeAll(() => {
    vi.spyOn(AuthContextModule, 'useAuthContext').mockReturnValue({
      user: mockUser,
      organization: mockOrganization,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  const mockUseGetCurrentApiKeyQuery =
    useGetCurrentApiKeyQuery as MockedFunction<typeof useGetCurrentApiKeyQuery>;
  const mockUseGenerateApiKeyMutation =
    useGenerateApiKeyMutation as MockedFunction<
      typeof useGenerateApiKeyMutation
    >;

  const idleGenerateApiKey = (mutate = vi.fn()) =>
    createIdleMutationResult<GenerateApiKeyResponse, Error, void>({
      mutate,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when rendering with no API key', () => {
    beforeEach(() => {
      mockUseGetCurrentApiKeyQuery.mockReturnValue(
        createSuccessQueryResult<GetCurrentApiKeyResponse>({
          hasApiKey: false,
        }),
      );
      mockUseGenerateApiKeyMutation.mockReturnValue(idleGenerateApiKey());

      renderWithQueryClient(<CliAuthentication />);
    });

    it('displays Login Command tab', () => {
      expect(screen.getByText('Login Command')).toBeInTheDocument();
    });

    it('displays Environment Variable tab', () => {
      expect(screen.getByText('Environment Variable')).toBeInTheDocument();
    });

    it('displays terminal instruction text', () => {
      expect(
        screen.getByText(/Run this command in your terminal/),
      ).toBeInTheDocument();
    });

    it('displays packmind login command', () => {
      expect(screen.getByDisplayValue(/packmind login/)).toBeInTheDocument();
    });
  });

  describe('when user has an active API key', () => {
    const expirationDate = new Date('2024-12-31T23:59:59.000Z');

    beforeEach(async () => {
      mockUseGetCurrentApiKeyQuery.mockReturnValue(
        createSuccessQueryResult<GetCurrentApiKeyResponse>({
          hasApiKey: true,
          expiresAt: expirationDate,
        }),
      );
      mockUseGenerateApiKeyMutation.mockReturnValue(idleGenerateApiKey());

      renderWithQueryClient(<CliAuthentication />);

      const envVarTab = screen.getByText('Environment Variable');
      fireEvent.click(envVarTab);
    });

    it('displays Active API Key heading', async () => {
      await waitFor(() => {
        expect(screen.getByText('Active API Key')).toBeInTheDocument();
      });
    });

    it('displays expiration message', async () => {
      await waitFor(() => {
        expect(
          screen.getByText(/You have an active API key that expires on/),
        ).toBeInTheDocument();
      });
    });

    it('displays Generate New API Key button', async () => {
      await waitFor(() => {
        expect(screen.getByText('Generate New API Key')).toBeInTheDocument();
      });
    });
  });

  describe('when user clicks Generate New API Key with existing key', () => {
    beforeEach(async () => {
      mockUseGetCurrentApiKeyQuery.mockReturnValue(
        createSuccessQueryResult<GetCurrentApiKeyResponse>({
          hasApiKey: true,
          expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        }),
      );
      mockUseGenerateApiKeyMutation.mockReturnValue(idleGenerateApiKey());

      renderWithQueryClient(<CliAuthentication />);

      const envVarTab = screen.getByText('Environment Variable');
      fireEvent.click(envVarTab);

      await waitFor(() => {
        expect(screen.getByText('Generate New API Key')).toBeInTheDocument();
      });

      const generateButton = screen.getByText('Generate New API Key');
      fireEvent.click(generateButton);
    });

    it('displays confirmation dialog title', async () => {
      await waitFor(() => {
        expect(
          screen.getByText('Replace Existing API Key?'),
        ).toBeInTheDocument();
      });
    });

    it('displays invalidation warning message', async () => {
      await waitFor(() => {
        expect(
          screen.getByText(/This will invalidate your current API key/),
        ).toBeInTheDocument();
      });
    });

    it('displays confirm button', async () => {
      await waitFor(() => {
        expect(screen.getByText('Yes, Generate New Key')).toBeInTheDocument();
      });
    });

    it('displays cancel button', async () => {
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });
  });

  describe('when user clicks Generate API Key button', () => {
    const mutateMock = vi.fn();

    beforeEach(async () => {
      mockUseGetCurrentApiKeyQuery.mockReturnValue(
        createSuccessQueryResult<GetCurrentApiKeyResponse>({
          hasApiKey: false,
        }),
      );
      mockUseGenerateApiKeyMutation.mockReturnValue(
        idleGenerateApiKey(mutateMock),
      );

      renderWithQueryClient(<CliAuthentication />);

      const envVarTab = screen.getByText('Environment Variable');
      fireEvent.click(envVarTab);

      await waitFor(() => {
        screen.getByText('Generate API Key');
      });

      const generateButton = screen.getByText('Generate API Key');
      fireEvent.click(generateButton);
    });

    it('calls mutate function', () => {
      expect(mutateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when API key generation succeeds', () => {
    const mockApiKey = 'test-api-key-123';
    const mockExpiresAt = new Date('2024-12-31T23:59:59.000Z');

    beforeEach(async () => {
      mockUseGetCurrentApiKeyQuery.mockReturnValue(
        createSuccessQueryResult<GetCurrentApiKeyResponse>({
          hasApiKey: false,
        }),
      );
      mockUseGenerateApiKeyMutation.mockReturnValue(
        createSuccessMutationResult<GenerateApiKeyResponse, Error, void>({
          data: { apiKey: mockApiKey, expiresAt: mockExpiresAt },
          variables: undefined,
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          reset: vi.fn(),
        }),
      );

      renderWithQueryClient(<CliAuthentication />);

      const envVarTab = screen.getByText('Environment Variable');
      fireEvent.click(envVarTab);
    });

    it('displays success message', async () => {
      await waitFor(() => {
        expect(
          screen.getByText('API Key Generated Successfully!'),
        ).toBeInTheDocument();
      });
    });

    it('displays generated API key in input field', async () => {
      await waitFor(() => {
        expect(
          screen.getByTestId(CliAuthenticationDataTestIds.ApiKeyInput),
        ).toHaveValue(mockApiKey);
      });
    });
  });
});
