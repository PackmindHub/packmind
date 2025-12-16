import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { OnboardingSteps } from './OnboardingSteps';
import {
  useCreateCliLoginCodeMutation,
  useGetCurrentApiKeyQuery,
  useGenerateApiKeyMutation,
  useGetMcpTokenMutation,
  useGetMcpURLQuery,
} from '../api/queries/AuthQueries';

jest.mock('../api/queries/AuthQueries', () => ({
  useCreateCliLoginCodeMutation: jest.fn(),
  useGetCurrentApiKeyQuery: jest.fn(),
  useGenerateApiKeyMutation: jest.fn(),
  useGetMcpTokenMutation: jest.fn(),
  useGetMcpURLQuery: jest.fn(),
}));

jest.mock('../hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    organization: {
      id: 'org-1',
      name: 'Test Organization',
      slug: 'test-org',
      role: 'ADMIN',
    },
    user: {
      id: 'user-1',
      email: 'test@example.com',
    },
  }),
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
  }) => <input type="text" value={value} readOnly {...props} />,
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={['/org/test-org/space/test-space']}>
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
};

describe('OnboardingSteps', () => {
  const mockUseCreateCliLoginCodeMutation =
    useCreateCliLoginCodeMutation as jest.MockedFunction<
      typeof useCreateCliLoginCodeMutation
    >;

  const mockUseGetCurrentApiKeyQuery =
    useGetCurrentApiKeyQuery as jest.MockedFunction<
      typeof useGetCurrentApiKeyQuery
    >;

  const mockUseGenerateApiKeyMutation =
    useGenerateApiKeyMutation as jest.MockedFunction<
      typeof useGenerateApiKeyMutation
    >;

  const mockUseGetMcpTokenMutation =
    useGetMcpTokenMutation as jest.MockedFunction<
      typeof useGetMcpTokenMutation
    >;

  const mockUseGetMcpURLQuery = useGetMcpURLQuery as jest.MockedFunction<
    typeof useGetMcpURLQuery
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

  const defaultQueryResult = {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    status: 'idle' as const,
    refetch: jest.fn(),
    isFetching: false,
    isPending: false,
    isRefetching: false,
    isLoadingError: false,
    isRefetchError: false,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: false,
    isFetchedAfterMount: false,
    isPlaceholderData: false,
    isStale: false,
    isPaused: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCreateCliLoginCodeMutation.mockReturnValue(
      defaultMutationResult as ReturnType<typeof useCreateCliLoginCodeMutation>,
    );
    mockUseGetCurrentApiKeyQuery.mockReturnValue(
      defaultQueryResult as ReturnType<typeof useGetCurrentApiKeyQuery>,
    );
    mockUseGenerateApiKeyMutation.mockReturnValue(
      defaultMutationResult as ReturnType<typeof useGenerateApiKeyMutation>,
    );
    mockUseGetMcpTokenMutation.mockReturnValue(
      defaultMutationResult as ReturnType<typeof useGetMcpTokenMutation>,
    );
    mockUseGetMcpURLQuery.mockReturnValue(
      defaultQueryResult as ReturnType<typeof useGetMcpURLQuery>,
    );
  });

  it('renders all three onboarding steps', () => {
    renderWithProviders(<OnboardingSteps />);

    expect(
      screen.getByText(/Configure your local environment/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Build your playbook/)).toBeInTheDocument();
    expect(screen.getByText(/Vibe code with confidence/)).toBeInTheDocument();
  });

  it('renders the first step expanded by default', () => {
    renderWithProviders(<OnboardingSteps />);

    // The first step should be expanded and show the SetupLocalEnvironment component content
    expect(
      screen.getByText(
        'Copy and run this command in your terminal to install the CLI and MCP server automatically:',
      ),
    ).toBeInTheDocument();
  });

  it('renders placeholder content for step 2', () => {
    renderWithProviders(<OnboardingSteps />);

    expect(
      screen.getByText(
        'Create standards and recipes tailored to your project context. With configured MCP server, use this prompt with your AI coding agent:',
      ),
    ).toBeInTheDocument();
  });

  it('renders content for step 3', () => {
    renderWithProviders(<OnboardingSteps />);

    expect(screen.getByText('Create packages')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Standards and recipes must be bundled into packages to be distributed in your projects.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Configure the target AI agents'),
    ).toBeInTheDocument();
    expect(screen.getByText('Distribute playbook')).toBeInTheDocument();
  });
});
