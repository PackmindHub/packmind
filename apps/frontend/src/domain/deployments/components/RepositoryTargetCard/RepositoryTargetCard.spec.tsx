import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { createGitRepoId, TargetWithRepository } from '@packmind/types';
import { RepositoryTargetCard } from './RepositoryTargetCard';

const trackedBranchProbe = vi.fn();

vi.mock('../../../git/api/queries', () => ({
  useCheckTrackedBranchExistsQuery: (
    ...args: [unknown, unknown]
  ): { data: boolean | undefined } => trackedBranchProbe(...args),
}));

vi.mock('../TargetManagementDialog/TargetManagementDialog', () => ({
  TargetManagementDialog: () => null,
}));

const gitRepoId = createGitRepoId('repo-1');

const makeTarget = (branch: string): TargetWithRepository =>
  ({
    id: 'target-1',
    name: 'Root',
    path: '/',
    repository: { owner: 'my-orga', repo: 'my-repo', branch },
  }) as unknown as TargetWithRepository;

const renderCard = (hasAuth = true) =>
  render(
    <MemoryRouter>
      <UIProvider>
        <RepositoryTargetCard
          repositoryName="my-orga/my-repo"
          providerUrl="github.com"
          targets={[makeTarget('feature/login')]}
          gitRepoId={gitRepoId}
          hasAuth={hasAuth}
        />
      </UIProvider>
    </MemoryRouter>,
  );

describe('RepositoryTargetCard', () => {
  afterEach(() => vi.clearAllMocks());

  describe('when the tracked branch no longer exists on the provider', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: false });
      renderCard();
    });

    it('marks the branch as deleted', () => {
      expect(screen.getByTestId('deleted-branch-badge')).toBeInTheDocument();
    });
  });

  describe('when the tracked branch still exists', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: true });
      renderCard();
    });

    it('says nothing about the branch', () => {
      expect(
        screen.queryByTestId('deleted-branch-badge'),
      ).not.toBeInTheDocument();
    });
  });

  // "We could not ask" is not "the branch is gone".
  describe('when the probe has no answer', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: undefined });
      renderCard();
    });

    it('says nothing about the branch', () => {
      expect(
        screen.queryByTestId('deleted-branch-badge'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the connection has no working credentials', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: undefined });
      renderCard(false);
    });

    // Probing without credentials only produces a failure.
    it('does not probe the provider', () => {
      expect(trackedBranchProbe).toHaveBeenCalledWith(gitRepoId, {
        enabled: false,
      });
    });
  });
});
