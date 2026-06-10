import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { DistributionStatus } from '@packmind/types';
import { DistributionStatusBadge } from './DistributionStatusBadge';

describe('DistributionStatusBadge', () => {
  const renderBadge = (status: DistributionStatus) =>
    render(
      <UIProvider>
        <DistributionStatusBadge status={status} />
      </UIProvider>,
    );

  it.each([
    [DistributionStatus.in_progress, 'In progress'],
    [DistributionStatus.pending_merge, 'Pending PR review'],
    [DistributionStatus.success, 'Published'],
    [DistributionStatus.failure, 'Failed'],
    [DistributionStatus.no_changes, 'No changes'],
    [DistributionStatus.to_be_removed, 'To be removed'],
    [DistributionStatus.removed, 'Removed'],
  ])('renders %s with the expected label %s', (status, label) => {
    renderBadge(status);

    expect(
      screen.getByTestId(`distribution-status-badge-${status}`),
    ).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  describe('when a removal has been requested on a still-published row', () => {
    it('renders the removal-pending state instead of Published', () => {
      render(
        <UIProvider>
          <DistributionStatusBadge
            status={DistributionStatus.success}
            removalRequestedAt={new Date('2026-06-10T12:00:00Z')}
          />
        </UIProvider>,
      );

      expect(
        screen.getByTestId('distribution-status-badge-removal_pending'),
      ).toBeInTheDocument();
      expect(screen.getByText('Removal pending')).toBeInTheDocument();
    });
  });
});
