import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import { AddConnectionDrawer } from '../AddConnectionDrawer';
import { useGetMeQuery } from '../../../../accounts/api/queries/UserQueries';
import { useCreateGitProviderMutation } from '../../../api/queries';
import { createIdleMutationResult } from '../../../../../test/mutationResultMocks';
import type { MockedFunction } from 'vitest';

vi.mock('../../../../accounts/api/queries/UserQueries', () => ({
  useGetMeQuery: vi.fn(),
}));

vi.mock('../../../api/queries', () => ({
  useCreateGitProviderMutation: vi.fn(),
}));

// The App block owns the redirect to GitHub; here we only care which props the
// drawer hands it, so it is replaced by a probe that records them.
const appBlockProps = vi.fn();
vi.mock('../GitHubAppAuthBlock', () => ({
  GitHubAppAuthBlock: (props: { displayName?: string }) => {
    appBlockProps(props);
    return <div data-testid="github-app-auth-block" />;
  },
}));

const mockOrganizationId = 'org-1' as OrganizationId;

const renderDrawer = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          <AddConnectionDrawer
            organizationId={mockOrganizationId}
            open
            onClose={vi.fn()}
          />
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
};

const lastAppBlockProps = (): { displayName?: string } =>
  appBlockProps.mock.calls[appBlockProps.mock.calls.length - 1][0];

describe('AddConnectionDrawer', () => {
  beforeEach(() => {
    (useGetMeQuery as MockedFunction<typeof useGetMeQuery>).mockReturnValue({
      data: {
        authenticated: true,
        organization: { id: mockOrganizationId, githubAppMode: 'on-prem' },
      },
    } as unknown as ReturnType<typeof useGetMeQuery>);

    (
      useCreateGitProviderMutation as MockedFunction<
        typeof useCreateGitProviderMutation
      >
    ).mockReturnValue(
      createIdleMutationResult({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        reset: vi.fn(),
      }) as unknown as ReturnType<typeof useCreateGitProviderMutation>,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const displayNameInput = () =>
    screen.getByPlaceholderText(/e\.g\. production github/i);

  describe('when a display name is typed', () => {
    it('forwards it to the GitHub App block', async () => {
      const user = userEvent.setup();
      renderDrawer();

      await user.type(displayNameInput(), 'Production GitHub');

      expect(lastAppBlockProps().displayName).toBe('Production GitHub');
    });
  });

  describe('when no display name is typed', () => {
    it('forwards an empty display name to the GitHub App block', () => {
      renderDrawer();

      expect(lastAppBlockProps().displayName).toBe('');
    });
  });
});
