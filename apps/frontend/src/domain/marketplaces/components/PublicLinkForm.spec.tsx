import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { PublicLinkForm } from './PublicLinkForm';

const useValidateMarketplaceUrlMock = jest.fn();
const useLinkMarketplaceMock = jest.fn();

jest.mock('../api/queries', () => ({
  useValidateMarketplaceUrl: (...args: unknown[]) =>
    useValidateMarketplaceUrlMock(...args),
  useLinkMarketplace: (...args: unknown[]) => useLinkMarketplaceMock(...args),
}));

function renderForm() {
  const onLinked = jest.fn();
  const onCancel = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        <PublicLinkForm
          organizationId="org-1"
          onLinked={onLinked}
          onCancel={onCancel}
        />
      </QueryClientProvider>
    </UIProvider>,
  );

  return { onLinked, onCancel };
}

describe('PublicLinkForm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useValidateMarketplaceUrlMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
    });
    useLinkMarketplaceMock.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ name: 'OSS Playbook' }),
      isPending: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('shows the idle hint copy by default', () => {
    renderForm();
    expect(screen.getByText(/Paste an HTTPS or SSH URL/i)).toBeInTheDocument();
  });

  it('shows the checking spinner while validation is loading', () => {
    useValidateMarketplaceUrlMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true,
      isError: false,
      error: undefined,
    });

    renderForm();
    act(() => {
      fireEvent.change(screen.getByLabelText('Repository URL'), {
        target: { value: 'https://github.com/acme/playbook' },
      });
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByText('Checking access…')).toBeInTheDocument();
  });

  it('shows the verified state when validation succeeds', () => {
    useValidateMarketplaceUrlMock.mockReturnValue({
      data: {
        kind: 'verified',
        repoPath: 'acme/playbook',
        defaultBranch: 'main',
        pluginCount: 3,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
    });

    renderForm();
    act(() => {
      fireEvent.change(screen.getByLabelText('Repository URL'), {
        target: { value: 'https://github.com/acme/playbook' },
      });
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByText('Repository verified')).toBeInTheDocument();
    expect(screen.getByText(/3 plugins/)).toBeInTheDocument();
  });

  it('disables submit until name is filled in after verification', () => {
    useValidateMarketplaceUrlMock.mockReturnValue({
      data: {
        kind: 'verified',
        repoPath: 'acme/playbook',
        defaultBranch: 'main',
        pluginCount: 2,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
    });

    renderForm();
    act(() => {
      fireEvent.change(screen.getByLabelText('Repository URL'), {
        target: { value: 'https://github.com/acme/playbook' },
      });
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(
      screen.getByRole('button', { name: 'Link marketplace' }),
    ).toBeDisabled();
  });

  it('submits with parsed coordinates once the form is verified and named', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ name: 'OSS Playbook' });
    useLinkMarketplaceMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
    useValidateMarketplaceUrlMock.mockReturnValue({
      data: {
        kind: 'verified',
        repoPath: 'acme/playbook',
        defaultBranch: 'main',
        pluginCount: 4,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
    });

    renderForm();
    act(() => {
      fireEvent.change(screen.getByLabelText('Repository URL'), {
        target: { value: 'https://github.com/acme/playbook' },
      });
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    act(() => {
      fireEvent.change(screen.getByLabelText('Display name'), {
        target: { value: 'OSS Playbook' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Link marketplace' }));
    });

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'acme',
          repo: 'playbook',
          branch: 'main',
          name: 'OSS Playbook',
        }),
      ),
    );
  });
});
