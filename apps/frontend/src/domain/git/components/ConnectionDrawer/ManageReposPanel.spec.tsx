import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { createGitProviderId, createGitRepoId } from '@packmind/types';
import { ManageReposPanel } from './ManageReposPanel';
import { GitProviderUI } from '../../types/GitProviderTypes';

const trackedBranchProbe = vi.fn();

vi.mock('../../api/queries', () => ({
  useGetRepositoriesByProviderQuery: () => ({
    data: [
      {
        id: createGitRepoId('repo-1'),
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'feature/login',
        providerId: createGitProviderId('provider-1'),
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useGetAvailableRepositoriesQuery: () => ({
    data: {
      repositories: [
        {
          owner: 'my-orga',
          name: 'my-repo',
          fullName: 'my-orga/my-repo',
          defaultBranch: 'main',
        },
      ],
    },
    isLoading: false,
    isError: false,
    hasNextPage: false,
  }),
  useCheckTrackedBranchExistsQuery: (...args: [unknown]) =>
    trackedBranchProbe(...args),
}));

const provider = {
  id: createGitProviderId('provider-1'),
  source: 'github',
  url: 'https://github.com',
} as unknown as GitProviderUI;

const renderPanel = () =>
  render(
    <UIProvider>
      <ManageReposPanel
        provider={provider}
        selection={{
          tuples: [
            { owner: 'my-orga', repo: 'my-repo', branch: 'feature/login' },
            { owner: 'my-orga', repo: 'my-repo', branch: 'not-saved-yet' },
          ],
        }}
        onSelectionChange={vi.fn()}
        progress={null}
        onRequestReauth={vi.fn()}
      />
    </UIProvider>,
  );

const rowFor = (branch: string) =>
  screen
    .getAllByTestId('manage-repos-row')
    .find((row) => row.getAttribute('data-branch') === branch) as HTMLElement;

describe('ManageReposPanel', () => {
  afterEach(() => vi.clearAllMocks());

  describe('when a tracked branch no longer exists on the provider', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: false });
      renderPanel();
    });

    it('marks that branch as deleted', () => {
      expect(
        within(rowFor('feature/login')).getByTestId('deleted-branch-badge'),
      ).toBeInTheDocument();
    });
  });

  describe('when the tracked branches still exist', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: true });
      renderPanel();
    });

    it('marks no branch as deleted', () => {
      expect(
        screen.queryByTestId('deleted-branch-badge'),
      ).not.toBeInTheDocument();
    });
  });

  // Nothing is tracked for a branch the user has only just ticked, so there is
  // no repository to probe and nothing to accuse.
  describe('when a branch was added in the drawer but not saved', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: undefined });
      renderPanel();
    });

    it('probes without a repository id', () => {
      expect(trackedBranchProbe).toHaveBeenCalledWith(undefined);
    });
  });
});
