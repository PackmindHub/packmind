import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { SpacesToolbar } from './SpacesToolbar';

jest.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    organization: {
      id: 'org-1',
      name: 'Test Organization',
      slug: 'test-org',
      role: 'admin',
    },
  }),
}));

const capturedDialogProps: {
  current: { onCreated?: () => void | Promise<void> } | null;
} = { current: null };

jest.mock('../../../spaces-management/components/CreateSpaceDialog', () => ({
  CreateSpaceDialog: (props: {
    open: boolean;
    setOpen: (open: boolean) => void;
    redirectAfterCreate?: boolean;
    onCreated?: () => void | Promise<void>;
  }) => {
    capturedDialogProps.current = props;
    return props.open ? (
      <div data-testid="create-space-dialog-stub">dialog open</div>
    ) : null;
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    ...render(
      <UIProvider>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </UIProvider>,
    ),
  };
};

describe('SpacesToolbar', () => {
  beforeEach(() => {
    capturedDialogProps.current = null;
  });

  it('opens the CreateSpaceDialog when clicking the "New space" button', async () => {
    renderWithProviders(<SpacesToolbar />);

    expect(screen.queryByTestId('create-space-dialog-stub')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /new space/i }));

    expect(screen.getByTestId('create-space-dialog-stub')).toBeInTheDocument();
  });

  it('passes redirectAfterCreate=false to CreateSpaceDialog', async () => {
    renderWithProviders(<SpacesToolbar />);

    await userEvent.click(screen.getByRole('button', { name: /new space/i }));

    expect(capturedDialogProps.current).not.toBeNull();
    expect(
      (capturedDialogProps.current as { redirectAfterCreate?: boolean })
        .redirectAfterCreate,
    ).toBe(false);
  });

  it('invalidates the management spaces query when onCreated fires', async () => {
    const invalidateSpy = jest.spyOn(
      QueryClient.prototype,
      'invalidateQueries',
    );

    renderWithProviders(<SpacesToolbar />);

    await userEvent.click(screen.getByRole('button', { name: /new space/i }));

    const onCreated = capturedDialogProps.current?.onCreated;
    expect(typeof onCreated).toBe('function');

    await act(async () => {
      await onCreated?.();
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['spaces', 'management']),
      }),
    );

    invalidateSpy.mockRestore();
  });

  it('closes the dialog after onCreated resolves', async () => {
    renderWithProviders(<SpacesToolbar />);

    await userEvent.click(screen.getByRole('button', { name: /new space/i }));
    expect(screen.getByTestId('create-space-dialog-stub')).toBeInTheDocument();

    await act(async () => {
      await capturedDialogProps.current?.onCreated?.();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('create-space-dialog-stub')).toBeNull();
    });
  });
});
