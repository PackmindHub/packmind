import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { SetupLocalEnvironment } from './SetupLocalEnvironment';
import { useCreateCliLoginCodeMutation } from '../api/queries/AuthQueries';

jest.mock('../api/queries/AuthQueries', () => ({
  useCreateCliLoginCodeMutation: jest.fn(),
}));

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

describe('SetupLocalEnvironment', () => {
  const mockUseCreateCliLoginCodeMutation =
    useCreateCliLoginCodeMutation as jest.MockedFunction<
      typeof useCreateCliLoginCodeMutation
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
    mockUseCreateCliLoginCodeMutation.mockReturnValue(
      defaultMutationResult as ReturnType<typeof useCreateCliLoginCodeMutation>,
    );
  });

  it('automatically generates install command on mount', () => {
    const mutateMock = jest.fn();
    mockUseCreateCliLoginCodeMutation.mockReturnValue({
      ...defaultMutationResult,
      mutate: mutateMock,
    } as ReturnType<typeof useCreateCliLoginCodeMutation>);

    renderWithQueryClient(<SetupLocalEnvironment />);

    expect(mutateMock).toHaveBeenCalledTimes(1);
  });

  it('displays loading state while generating command', () => {
    mockUseCreateCliLoginCodeMutation.mockReturnValue({
      ...defaultMutationResult,
      isPending: true,
    } as ReturnType<typeof useCreateCliLoginCodeMutation>);

    renderWithQueryClient(<SetupLocalEnvironment />);

    expect(
      screen.getByText('Generating install command...'),
    ).toBeInTheDocument();
  });

  it('displays install command when successfully generated', () => {
    const mockCode = 'test-login-code-123';
    const mockExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    mockUseCreateCliLoginCodeMutation.mockReturnValue({
      ...defaultMutationResult,
      isSuccess: true,
      data: { code: mockCode, expiresAt: mockExpiresAt },
    } as ReturnType<typeof useCreateCliLoginCodeMutation>);

    renderWithQueryClient(<SetupLocalEnvironment />);

    expect(screen.getByTestId('install-command')).toBeInTheDocument();
    expect(screen.getByText(/Code expires in \d+ minute/)).toBeInTheDocument();
    expect(screen.getByText('Generate New Command')).toBeInTheDocument();
  });

  it('allows generating a new command', () => {
    const mutateMock = jest.fn();
    const mockCode = 'test-login-code-123';
    const mockExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    mockUseCreateCliLoginCodeMutation.mockReturnValue({
      ...defaultMutationResult,
      mutate: mutateMock,
      isSuccess: true,
      data: { code: mockCode, expiresAt: mockExpiresAt },
    } as ReturnType<typeof useCreateCliLoginCodeMutation>);

    renderWithQueryClient(<SetupLocalEnvironment />);

    const button = screen.getByText('Generate New Command');
    fireEvent.click(button);

    // Should only be called once from the button click, not on mount (since data exists)
    expect(mutateMock).toHaveBeenCalledTimes(1);
  });

  it('displays error when generation fails', () => {
    const mockError = new Error('Failed to generate code');

    mockUseCreateCliLoginCodeMutation.mockReturnValue({
      ...defaultMutationResult,
      isError: true,
      error: mockError,
    } as ReturnType<typeof useCreateCliLoginCodeMutation>);

    renderWithQueryClient(<SetupLocalEnvironment />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to generate code')).toBeInTheDocument();
  });
});
