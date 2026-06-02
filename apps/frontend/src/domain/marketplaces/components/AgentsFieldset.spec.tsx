import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { AgentsFieldset } from './AgentsFieldset';

describe('AgentsFieldset', () => {
  it('renders the Claude Code badge for the anthropic vendor', () => {
    render(
      <UIProvider>
        <AgentsFieldset vendor="anthropic" />
      </UIProvider>,
    );

    expect(
      screen.getByTestId('agents-fieldset-vendor-anthropic'),
    ).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Render plugins for')).toBeInTheDocument();
  });

  it('renders the default helper copy when no override is passed', () => {
    render(
      <UIProvider>
        <AgentsFieldset vendor="anthropic" />
      </UIProvider>,
    );

    expect(screen.getByText(/native format/i)).toBeInTheDocument();
  });

  it('honors a custom helper copy', () => {
    render(
      <UIProvider>
        <AgentsFieldset vendor="anthropic" helper="Custom helper text." />
      </UIProvider>,
    );

    expect(screen.getByText('Custom helper text.')).toBeInTheDocument();
  });
});
