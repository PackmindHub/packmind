import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { ApiKeyConfig } from './ApiKeyConfig';
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

// Mock the queries
jest.mock('../api/queries/AuthQueries', () => ({
  useGetCurrentApiKeyQuery: jest.fn(),
  useGenerateApiKeyMutation: jest.fn(),
}));

// Mock the CopiableTextarea component
jest.mock('../../../shared/components/inputs', () => ({
  CopiableTextarea: ({
    value,
    ...props
  }: {
    value: string;
    [key: string]: unknown;
  }) => <textarea value={value} readOnly {...props} />,
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

interface MockQueryResult {
  data?: { hasApiKey: boolean; expiresAt?: string };
  isLoading: boolean;
  isError: boolean;
}

interface MockMutationResult {
  mutate: jest.Mock;
  mutateAsync: jest.Mock;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
  status: 'idle' | 'pending' | 'error' | 'success';
  data?: { apiKey: string; expiresAt: string };
  error: Error | null;
  variables?: { host: string };
  reset: jest.Mock;
  failureCount: number;
  failureReason: Error | null;
  submittedAt: number;
  context: unknown;
  isPaused: boolean;
}

describe('ApiKeyConfig', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render API key section', () => {
    const mockQueryResult: MockQueryResult = {
      data: { hasApiKey: false },
      isLoading: false,
      isError: false,
    };

    const mockMutationResult: MockMutationResult = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      isIdle: true,
      status: 'idle',
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

    mockUseGetCurrentApiKeyQuery.mockReturnValue(
      mockQueryResult as ReturnType<typeof useGetCurrentApiKeyQuery>,
    );
    mockUseGenerateApiKeyMutation.mockReturnValue(
      mockMutationResult as ReturnType<typeof useGenerateApiKeyMutation>,
    );

    renderWithQueryClient(<ApiKeyConfig />);

    expect(screen.getByText('API Key')).toBeInTheDocument();
    expect(
      screen.getByText(/Generate an API key for Packmind CLI/),
    ).toBeInTheDocument();
  });

  it('should show active API key info when user has a key', () => {
    const expirationDate = '2024-12-31T23:59:59.000Z';

    const mockQueryResult: MockQueryResult = {
      data: { hasApiKey: true, expiresAt: expirationDate },
      isLoading: false,
      isError: false,
    };

    const mockMutationResult: MockMutationResult = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      isIdle: true,
      status: 'idle',
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

    mockUseGetCurrentApiKeyQuery.mockReturnValue(
      mockQueryResult as ReturnType<typeof useGetCurrentApiKeyQuery>,
    );
    mockUseGenerateApiKeyMutation.mockReturnValue(
      mockMutationResult as ReturnType<typeof useGenerateApiKeyMutation>,
    );

    renderWithQueryClient(<ApiKeyConfig />);

    expect(screen.getByText('Active API Key')).toBeInTheDocument();
    expect(
      screen.getByText(/You have an active API key that expires on/),
    ).toBeInTheDocument();
    expect(screen.getByText('Generate New API Key')).toBeInTheDocument();
  });

  it('should show confirmation dialog when generating new key with existing key', async () => {
    const mockQueryResult: MockQueryResult = {
      data: { hasApiKey: true, expiresAt: '2024-12-31T23:59:59.000Z' },
      isLoading: false,
      isError: false,
    };

    const mockMutationResult: MockMutationResult = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      isIdle: true,
      status: 'idle',
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

    mockUseGetCurrentApiKeyQuery.mockReturnValue(
      mockQueryResult as ReturnType<typeof useGetCurrentApiKeyQuery>,
    );
    mockUseGenerateApiKeyMutation.mockReturnValue(
      mockMutationResult as ReturnType<typeof useGenerateApiKeyMutation>,
    );

    renderWithQueryClient(<ApiKeyConfig />);

    const generateButton = screen.getByText('Generate New API Key');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Replace Existing API Key?')).toBeInTheDocument();
      expect(
        screen.getByText(/This will invalidate your current API key/),
      ).toBeInTheDocument();
      expect(screen.getByText('Yes, Generate New Key')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });
});
