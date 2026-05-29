import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { SubmitErrorBanner, type SubmitErrorReason } from './SubmitErrorBanner';

describe('SubmitErrorBanner', () => {
  const renderBanner = (
    reason: SubmitErrorReason,
    extra?: { name?: string; repoPath?: string },
  ) =>
    render(
      <UIProvider>
        <SubmitErrorBanner reason={reason} {...extra} />
      </UIProvider>,
    );

  it('renders the marketplace-already-linked copy with the repo path', () => {
    renderBanner('marketplace-already-linked', { repoPath: 'acme/playbook' });

    expect(
      screen.getByTestId('submit-error-banner-marketplace-already-linked'),
    ).toBeInTheDocument();
    expect(screen.getByText('Marketplace already linked')).toBeInTheDocument();
    expect(screen.getByText(/acme\/playbook/)).toBeInTheDocument();
  });

  it('renders the gitrepo-already-linked-as-standard copy without a repo path', () => {
    renderBanner('gitrepo-already-linked-as-standard');

    expect(screen.getByText('Repository already in use')).toBeInTheDocument();
  });

  it('renders the descriptor-not-found copy', () => {
    renderBanner('descriptor-not-found');

    expect(screen.getByText('marketplace.json not found')).toBeInTheDocument();
  });

  it('renders the unknown-descriptor copy', () => {
    renderBanner('unknown-descriptor');

    expect(
      screen.getByText('Unsupported marketplace format'),
    ).toBeInTheDocument();
  });

  it('renders the descriptor-parse-error copy', () => {
    renderBanner('descriptor-parse-error');

    expect(
      screen.getByText('Unable to read marketplace.json'),
    ).toBeInTheDocument();
  });

  it('renders the url-not-reachable copy', () => {
    renderBanner('url-not-reachable');

    expect(screen.getByText('Repository unreachable')).toBeInTheDocument();
  });

  it('renders the not-public copy', () => {
    renderBanner('not-public');

    expect(screen.getByText('Repository is not public')).toBeInTheDocument();
  });

  it('renders the network copy', () => {
    renderBanner('network');

    expect(screen.getByText('Unable to reach Packmind')).toBeInTheDocument();
  });
});
