import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { ArtifactsView } from './ArtifactsView';
import {
  RecipeDeploymentStatus,
  StandardDeploymentStatus,
} from '@packmind/shared/types';

// Provide lightweight realistic samples
const makeRecipe = (
  id: string,
  name: string,
  latest: number,
  targets: Array<{
    name: string;
    deployed: number;
    up: boolean;
    repo?: { owner: string; repo: string; branch?: string };
  }>,
): RecipeDeploymentStatus =>
  ({
    recipe: { id, name },
    latestVersion: { version: latest },
    targetDeployments: targets.map((t) => ({
      target: { id: `${id}-${t.name}`, name: t.name },
      deployedVersion: { version: t.deployed },
      isUpToDate: t.up,
      gitRepo: t.repo ?? {
        id: `${id}-${t.name}-repo`,
        owner: 'acme',
        repo: 'web',
        branch: 'main',
      },
    })),
  }) as unknown as RecipeDeploymentStatus;

const makeStandard = (
  id: string,
  name: string,
  latest: number,
  targets: Array<{
    name: string;
    deployed: number;
    up: boolean;
    repo?: { owner: string; repo: string; branch?: string };
  }>,
): StandardDeploymentStatus =>
  ({
    standard: { id, name },
    latestVersion: { version: latest },
    targetDeployments: targets.map((t) => ({
      target: { id: `${id}-${t.name}`, name: t.name },
      deployedVersion: { version: t.deployed },
      isUpToDate: t.up,
      gitRepo: t.repo ?? {
        id: `${id}-${t.name}-repo`,
        owner: 'acme',
        repo: 'api',
        branch: 'develop',
      },
    })),
  }) as unknown as StandardDeploymentStatus;

// Mock PMTable to render a simple table for assertions on rows/columns while keeping our mapping logic
jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  const ReactActual = jest.requireActual('react');
  type Column = { key: string; header: string };
  type Row = Record<string, React.ReactNode>;
  const getKey = (columns: Column[], row: Row) =>
    columns
      .map((c) => {
        const cell: unknown = row[c.key];
        if (cell == null) return c.key;
        if (typeof cell === 'string' || typeof cell === 'number')
          return String(cell);
        if (ReactActual.isValidElement(cell)) {
          const element = cell as React.ReactElement<{ children?: unknown }>;
          const children = element.props.children;
          return typeof children === 'string' || typeof children === 'number'
            ? String(children)
            : c.key;
        }
        return c.key;
      })
      .join('|');
  const PMTable = ({ columns, data }: { columns: Column[]; data: Row[] }) => (
    <table data-testid="pm-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={getKey(columns, row)}>
            {columns.map((c) => (
              <td key={c.key}>{row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
  return { ...actual, PMTable };
});

// Mock RunDistribution to avoid react-query and heavy internals in tests
jest.mock('../RunDistribution/RunDistribution', () => {
  type RDComponent = React.FC<{ children?: React.ReactNode }> & {
    Body: React.FC;
    Cta: React.FC;
  };
  const RunDistribution = (({ children }) => (
    <div data-testid="run-distribution">{children}</div>
  )) as RDComponent;
  RunDistribution.Body = () => <div data-testid="run-distribution-body" />;
  RunDistribution.Cta = () => <button>Deploy</button>;
  return {
    RunDistribution,
    useRunDistribution: () => ({ setSelectedTargetIds: jest.fn() }),
  };
});

const renderView = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <UIProvider>{ui}</UIProvider>
    </MemoryRouter>,
  );

describe('ArtifactsView', () => {
  afterEach(() => jest.clearAllMocks());
  it('renders data for recipes and standards with correct sorting by target name', () => {
    const recipes = [
      makeRecipe('r1', 'Recipe Z', 10, [
        { name: 'Prod', deployed: 8, up: false },
        { name: 'Alpha', deployed: 10, up: true },
      ]),
      makeRecipe('r2', 'Recipe A', 5, [
        { name: 'Beta', deployed: 5, up: true },
      ]),
    ];
    const standards = [
      makeStandard('s1', 'Standard B', 3, [
        { name: 'Gamma', deployed: 2, up: false },
        { name: 'Delta', deployed: 3, up: true },
      ]),
    ];

    renderView(
      <ArtifactsView
        recipes={recipes}
        standards={standards}
        artifactStatusFilter="all"
        searchTerm=""
        orgSlug="org-x"
      />,
    );

    // Sections
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    expect(screen.getByText('Standards')).toBeInTheDocument();

    // Artifact headings are links
    expect(screen.getByRole('link', { name: 'Recipe Z' })).toHaveAttribute(
      'href',
      '/org/org-x/recipes/r1',
    );
    expect(screen.getByRole('link', { name: 'Standard B' })).toHaveAttribute(
      'href',
      '/org/org-x/standards/s1',
    );

    // There should be one PMTable per artifact block
    const tables = screen.getAllByTestId('pm-table');
    // 2 recipes + 1 standard = 3 tables
    expect(tables).toHaveLength(3);

    // Check sorting by target names in first recipe table (Alpha before Prod)
    const recipeZTable = tables[0];
    const cells = within(recipeZTable).getAllByRole('cell');
    // First column is repository, second is target name => assert order contains Alpha then Prod
    const targetCells = cells.filter((_, idx) => idx % 5 === 1); // name column index 1 based on TABLE_COLUMNS order
    const targetText = targetCells.map(
      (c) => within(c).getByText(/Alpha|Prod/).textContent,
    );
    expect(targetText).toEqual(['Alpha', 'Prod']);
  });

  it('filters rows by status mode (outdated vs up-to-date)', () => {
    const recipes = [
      makeRecipe('r1', 'Recipe Z', 10, [
        { name: 'Prod', deployed: 8, up: false },
        { name: 'Alpha', deployed: 10, up: true },
      ]),
    ];
    const standards = [
      makeStandard('s1', 'Standard B', 3, [
        { name: 'Gamma', deployed: 2, up: false },
        { name: 'Delta', deployed: 3, up: true },
      ]),
    ];

    renderView(
      <ArtifactsView
        recipes={recipes}
        standards={standards}
        artifactStatusFilter="outdated"
        searchTerm=""
      />,
    );

    // In outdated mode, only outdated rows should be present
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Prod')).toBeInTheDocument();
    expect(screen.queryByText('Delta')).not.toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();

    // Status badges should read Outdated only
    expect(screen.getAllByText('Outdated').length).toBeGreaterThan(0);
  });

  it('opens update dialog when clicking Update button on outdated entries', async () => {
    const user = userEvent.setup();
    const recipes = [
      makeRecipe('r1', 'Recipe Z', 10, [
        { name: 'Prod', deployed: 8, up: false },
      ]),
    ];
    const standards: StandardDeploymentStatus[] = [];

    renderView(
      <ArtifactsView
        recipes={recipes}
        standards={standards}
        artifactStatusFilter="outdated"
        searchTerm=""
      />,
    );

    // Click the update button
    const btn = screen.getByRole('button', { name: 'Update' });
    await user.click(btn);

    // The dialog content should appear (title "Deploy to targets")
    expect(await screen.findByText('Deploy to targets')).toBeInTheDocument();
  });
});
