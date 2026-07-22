import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { ChangeProposalStatus } from '@packmind/types';
import {
  countPendingChangeProposals,
  PendingChangeProposalsWarning,
  ConfirmSaveWithPendingProposalsDialog,
} from './PendingChangeProposals';

describe('countPendingChangeProposals', () => {
  describe('when the response is undefined (OSS stub)', () => {
    it('returns 0', () => {
      expect(countPendingChangeProposals(undefined)).toBe(0);
    });
  });

  describe('when the response has no change proposals list', () => {
    it('returns 0', () => {
      expect(countPendingChangeProposals({})).toBe(0);
    });
  });

  describe('when the list mixes statuses', () => {
    it('counts only pending proposals', () => {
      const response = {
        changeProposals: [
          { status: ChangeProposalStatus.pending },
          { status: ChangeProposalStatus.applied },
          { status: ChangeProposalStatus.pending },
          { status: ChangeProposalStatus.rejected },
        ],
      };

      expect(countPendingChangeProposals(response)).toBe(2);
    });
  });
});

describe('PendingChangeProposalsWarning', () => {
  const renderWarning = (count: number) =>
    render(
      <UIProvider>
        <PendingChangeProposalsWarning count={count} itemType="standard" />
      </UIProvider>,
    );

  describe('when there are no pending change proposals', () => {
    it('renders nothing', () => {
      renderWarning(0);

      expect(screen.queryByText(/change proposal/)).not.toBeInTheDocument();
    });
  });

  describe('when there is one pending change proposal', () => {
    it('shows a singular warning message', () => {
      renderWarning(1);

      expect(
        screen.getByText(
          '1 change proposal is pending on this standard. Saving a new version will make it outdated.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('when there are several pending change proposals', () => {
    it('shows the count in the warning message', () => {
      renderWarning(3);

      expect(
        screen.getByText(
          '3 change proposals are pending on this standard. Saving a new version will make them outdated.',
        ),
      ).toBeInTheDocument();
    });
  });
});

describe('ConfirmSaveWithPendingProposalsDialog', () => {
  let onConfirm: jest.Mock;
  let onOpenChange: jest.Mock;

  beforeEach(() => {
    onConfirm = jest.fn();
    onOpenChange = jest.fn();

    render(
      <UIProvider>
        <ConfirmSaveWithPendingProposalsDialog
          open={true}
          onOpenChange={onOpenChange}
          count={2}
          itemType="command"
          onConfirm={onConfirm}
        />
      </UIProvider>,
    );
  });

  it('shows the pending change proposals consequence', () => {
    expect(
      screen.getByText(
        '2 change proposals are pending on this command. Saving a new version will make them outdated.',
      ),
    ).toBeInTheDocument();
  });

  describe('when the user confirms', () => {
    it('calls onConfirm', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save anyway' }));

      expect(onConfirm).toHaveBeenCalled();
    });
  });

  describe('when the user cancels', () => {
    it('closes the dialog without confirming', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onOpenChange).toHaveBeenCalledWith({ open: false });
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
