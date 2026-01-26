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
} from '@packmind/types';
import { CliAuthenticationDataTestIds } from '@packmind/frontend';

jest.mock('../api/queries/AuthQueries', () => ({
  useGetCurrentApiKeyQuery: jest.fn(),
  useGenerateApiKeyMutation: jest.fn(),
}));

jest.mock('../../../shared/components/inputs', () => ({
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
    jest.spyOn(AuthContextModule, 'useAuthContext').mockReturnValue({
      user: mockUser,
      organization: mockOrganization,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const mockUseGetCurrentApiKeyQuery =
    useGetCurrentApiKeyQuery as jest.MockedFunction<
      typeof useGetCurrentApiKeyQuery
    >;
  const mockUseGenerateApiKeyMutation =
    useGenerateApiKeyMutation as jest.MockedFunction<
      typeof useGenerateApiKeyMutation
    >;

  const defaultMutationResult = {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
    status: 'idle' as const,
    data: undefined,
    error: null,
    variables: undefined,
    reset: jest.fn(),
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    context: undefined,
    isPaused: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when rendering with no API key', () => {
    beforeEach(() => {
      const mockQueryResult = {
        data: { hasApiKey: false },
        isLoading: false,
        isError: false,
      };

      mockUseGetCurrentApiKeyQuery.mockReturnValue(
        mockQueryResult as ReturnType<typeof useGetCurrentApiKeyQuery>,
      );
      mockUseGenerateApiKeyMutation.mockReturnValue(
        defaultMutationResult as ReturnType<typeof useGenerateApiKeyMutation>,
      );

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

    it('displays packmind-cli login command', () => {
      expect(
        screen.getByDisplayValue(/packmind-cli login/),
      ).toBeInTheDocument();
    });
  });

  describe('when user has an active API key', () => {
    const expirationDate = '2024-12-31T23:59:59.000Z';

    beforeEach(async () => {
      const mockQueryResult = {
        data: { hasApiKey: true, expiresAt: expirationDate },
        isLoading: false,
        isError: false,
      };

      mockUseGetCurrentApiKeyQuery.mockReturnValue(
        mockQueryResult as ReturnType<typeof useGetCurrentApiKeyQuery>,
      );
      mockUseGenerateApiKeyMutation.mockReturnValue(
        defaultMutationResult as ReturnType<typeof useGenerateApiKeyMutation>,
      );

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
      const mockQueryResult = {
        data: { hasApiKey: true, expiresAt: '2024-12-31T23:59:59.000Z' },
        isLoading: false,
        isError: false,
      };

      mockUseGetCurrentApiKeyQuery.mockReturnValue(
        mockQueryResult as ReturnType<typeof useGetCurrentApiKeyQuery>,
      );
      mockUseGenerateApiKeyMutation.mockReturnValue(
        defaultMutationResult as ReturnType<typeof useGenerateApiKeyMutation>,
      );

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
    const mutateMock = jest.fn();

    beforeEach(async () => {
      const mockQueryResult = {
        data: { hasApiKey: false },
        isLoading: false,
        isError: false,
      };

      mockUseGetCurrentApiKeyQuery.mockReturnValue(
        mockQueryResult as ReturnType<typeof useGetCurrentApiKeyQuery>,
      );
      mockUseGenerateApiKeyMutation.mockReturnValue({
        ...defaultMutationResult,
        mutate: mutateMock,
      } as ReturnType<typeof useGenerateApiKeyMutation>);

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
    const mockExpiresAt = '2024-12-31T23:59:59.000Z';

    beforeEach(async () => {
      const mockQueryResult = {
        data: { hasApiKey: false },
        isLoading: false,
        isError: false,
      };

      mockUseGetCurrentApiKeyQuery.mockReturnValue(
        mockQueryResult as ReturnType<typeof useGetCurrentApiKeyQuery>,
      );
      mockUseGenerateApiKeyMutation.mockReturnValue({
        ...defaultMutationResult,
        isSuccess: true,
        data: { apiKey: mockApiKey, expiresAt: mockExpiresAt },
      } as ReturnType<typeof useGenerateApiKeyMutation>);

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
