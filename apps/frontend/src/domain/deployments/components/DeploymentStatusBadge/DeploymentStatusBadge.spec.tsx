import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { DeploymentStatusBadge } from './DeploymentStatusBadge';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
};

describe('DeploymentStatusBadge', () => {
  it('displays up-to-date status', () => {
    renderWithProvider(<DeploymentStatusBadge isUpToDate={true} />);

    expect(screen.getByText('Up to date')).toBeInTheDocument();
  });

  it('displays outdated status', () => {
    renderWithProvider(<DeploymentStatusBadge isUpToDate={false} />);

    expect(screen.getByText('Outdated')).toBeInTheDocument();
  });

  it('renders as a badge element', () => {
    renderWithProvider(<DeploymentStatusBadge isUpToDate={true} />);

    const badge = screen.getByText('Up to date');
    expect(badge).toHaveClass('chakra-badge');
  });
});
