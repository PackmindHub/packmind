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
});
