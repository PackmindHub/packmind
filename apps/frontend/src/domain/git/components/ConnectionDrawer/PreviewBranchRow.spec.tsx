import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { createGitRepoId } from '@packmind/types';
import { PreviewBranchRow } from './PreviewBranchRow';

const trackedBranchProbe = vi.fn();

vi.mock('../../api/queries', () => ({
  useCheckTrackedBranchExistsQuery: (...args: [unknown]) =>
    trackedBranchProbe(...args),
}));

const gitRepoId = createGitRepoId('repo-1');

const renderRow = () =>
  render(
    <UIProvider>
      <PreviewBranchRow branch="feature/login" gitRepoId={gitRepoId} />
    </UIProvider>,
  );

describe('PreviewBranchRow', () => {
  afterEach(() => vi.clearAllMocks());

  it('names the branch', () => {
    trackedBranchProbe.mockReturnValue({ data: true });
    renderRow();

    expect(screen.getByText('feature/login')).toBeInTheDocument();
  });

  describe('when the provider no longer has the branch', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: false });
      renderRow();
    });

    // The drawer opens on this list, so it is where the state has to show.
    it('marks the branch as deleted', () => {
      expect(screen.getByTestId('deleted-branch-badge')).toBeInTheDocument();
    });
  });

  describe('when the branch still exists', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: true });
      renderRow();
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
      renderRow();
    });

    it('says nothing about the branch', () => {
      expect(
        screen.queryByTestId('deleted-branch-badge'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when rendered', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: true });
      renderRow();
    });

    it('probes the repository behind the branch', () => {
      expect(trackedBranchProbe).toHaveBeenCalledWith(gitRepoId);
    });
  });
});
