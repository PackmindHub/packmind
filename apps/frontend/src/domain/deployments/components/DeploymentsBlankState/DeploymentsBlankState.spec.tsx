import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { DeploymentsBlankState } from './DeploymentsBlankState';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/org/test-org/space/test-space']}>
      <UIProvider>{ui}</UIProvider>
    </MemoryRouter>,
  );
};

// Mock PMTable to avoid internal UI hook/state issues in tests
jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  const PMTable = () => <div data-testid="pm-table" />;
  return { ...actual, PMTable };
});

describe('DeploymentsBlankState', () => {
  it('displays the main heading', () => {
    renderWithProvider(<DeploymentsBlankState />);
    expect(
      screen.getByText("Track and maintain your AI agents' instructions"),
    ).toBeInTheDocument();
  });

  it('displays the description', () => {
    renderWithProvider(<DeploymentsBlankState />);
    expect(
      screen.getByText(
        'Track versions of your recipes, standards, and skills across repositories. Identify and update outdated artifacts to ensure your AI agents perform at their best.',
      ),
    ).toBeInTheDocument();
  });

  it('displays the documentation link', () => {
    renderWithProvider(<DeploymentsBlankState />);
    const docLink = screen.getByText('Learn more about distribution');
    expect(docLink).toBeInTheDocument();
    expect(docLink.closest('a')).toHaveAttribute(
      'href',
      'https://docs.packmind.com/getting-started/gs-distribute',
    );
  });

  it('displays example heading', () => {
    renderWithProvider(<DeploymentsBlankState />);
    expect(
      screen.getByText('Example with demo repository and playbook'),
    ).toBeInTheDocument();
  });

  it('displays stub repository example', () => {
    renderWithProvider(<DeploymentsBlankState />);
    expect(screen.getByText('DunderMifflin/monorepo:main')).toBeInTheDocument();
  });

  it('displays stub target examples', () => {
    renderWithProvider(<DeploymentsBlankState />);
    expect(screen.getByText('api')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
  });

  it('displays KPI stats', () => {
    renderWithProvider(<DeploymentsBlankState />);
    expect(screen.getByText('Up-to-date')).toBeInTheDocument();
    expect(screen.getByText('Outdated')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays tables for each target', () => {
    renderWithProvider(<DeploymentsBlankState />);
    const tables = screen.getAllByTestId('pm-table');
    expect(tables.length).toBe(2); // api and frontend
  });
});
