import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  createOrganizationId,
  createSpaceId,
  SpaceType,
  UserSpaceWithRole,
} from '@packmind/types';
import { UIProvider } from '@packmind/ui';
import { useGetSpacesQuery } from '../../api/queries';
import { SpacesManagementPage } from './SpacesManagementPage';

jest.mock('../../api/queries', () => ({
  useGetSpacesQuery: jest.fn(),
}));

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  return {
    ...actual,
    PMTable: ({
      columns,
      data,
      selectable,
      getRowId,
      selectedRows,
      onSelectionChange,
    }: {
      columns: { key: string; header: React.ReactNode }[];
      data: Record<string, React.ReactNode>[];
      selectable?: boolean;
      getRowId?: (row: unknown, index: number) => string;
      selectedRows?: Set<string>;
      onSelectionChange?: (rows: Set<string>) => void;
    }) => {
      const handleToggle = (rowId: string) => {
        if (!onSelectionChange || !selectedRows) return;
        const next = new Set(selectedRows);
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }
        onSelectionChange(next);
      };
      const handleSelectAll = () => {
        if (!onSelectionChange || !selectedRows || !getRowId) return;
        const allIds = data.map((row, idx) => getRowId(row, idx));
        if (selectedRows.size === allIds.length) {
          onSelectionChange(new Set());
        } else {
          onSelectionChange(new Set(allIds));
        }
      };
      return (
        <table>
          <thead>
            <tr>
              {selectable && (
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const rowId = getRowId ? getRowId(row, index) : String(index);
              return (
                <tr key={rowId}>
                  {selectable && (
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select row ${rowId}`}
                        checked={selectedRows?.has(rowId) ?? false}
                        onChange={() => handleToggle(rowId)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key}>{row[col.key]}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    },
  };
});

const ORG_ID = createOrganizationId('11111111-1111-1111-1111-111111111111');

const buildUserSpace = (
  overrides: Partial<UserSpaceWithRole> = {},
): UserSpaceWithRole => ({
  id: createSpaceId('00000000-0000-0000-0000-000000000001'),
  name: 'Frontend',
  slug: 'frontend',
  type: SpaceType.open,
  organizationId: ORG_ID,
  isDefaultSpace: false,
  role: 'member',
  pinned: false,
  ...overrides,
});

const mockedUseGetSpacesQuery = useGetSpacesQuery as jest.MockedFunction<
  typeof useGetSpacesQuery
>;

type QueryShape = ReturnType<typeof useGetSpacesQuery>;

const setQueryResult = (overrides: Partial<QueryShape>) => {
  mockedUseGetSpacesQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as QueryShape);
};

const renderPage = () =>
  render(
    <UIProvider>
      <SpacesManagementPage />
    </UIProvider>,
  );

describe('SpacesManagementPage', () => {
  beforeEach(() => {
    mockedUseGetSpacesQuery.mockReset();
  });

  it('shows a loading indicator while spaces are loading', () => {
    setQueryResult({ isLoading: true });
    renderPage();
    expect(screen.getByTestId('spaces-loading')).toBeInTheDocument();
  });

  it('treats data === undefined (e.g. during refetch) as loading rather than empty', () => {
    setQueryResult({ isLoading: false, data: undefined });
    renderPage();
    expect(screen.getByTestId('spaces-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('spaces-empty')).not.toBeInTheDocument();
  });

  it('shows an actionable error message when the query fails', () => {
    setQueryResult({ isError: true, error: new Error('boom') });
    renderPage();
    expect(screen.getByText(/couldn't load your spaces/i)).toBeInTheDocument();
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });

  it('shows an empty state with a user-visible message when the user belongs to no spaces', () => {
    setQueryResult({ data: [] });
    renderPage();
    expect(screen.getByText(/no spaces yet/i)).toBeInTheDocument();
    expect(screen.getByText(/don't belong to any space/i)).toBeInTheDocument();
  });

  it('renders rows mapped from the real spaces returned by the API', () => {
    setQueryResult({
      data: [
        buildUserSpace({ name: 'Global', isDefaultSpace: true }),
        buildUserSpace({
          id: createSpaceId('00000000-0000-0000-0000-000000000002'),
          name: 'Frontend',
        }),
      ],
    });
    renderPage();
    expect(screen.getByText('Global')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('renders the org-wide badge only on the default space', () => {
    setQueryResult({
      data: [
        buildUserSpace({ name: 'Global', isDefaultSpace: true }),
        buildUserSpace({
          id: createSpaceId('00000000-0000-0000-0000-000000000002'),
          name: 'Frontend',
          isDefaultSpace: false,
        }),
      ],
    });
    renderPage();
    expect(screen.getAllByText(/org-wide/i)).toHaveLength(1);
  });

  it('renders an em-dash placeholder for fields the API does not return yet', () => {
    setQueryResult({ data: [buildUserSpace({ name: 'Frontend' })] });
    renderPage();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('hides the bulk action bar by default', () => {
    setQueryResult({ data: [buildUserSpace({ name: 'Frontend' })] });
    renderPage();
    expect(
      screen.queryByTestId('spaces-bulk-action-bar'),
    ).not.toBeInTheDocument();
  });

  it('reveals the bulk action bar with "1 selected" when a row checkbox is checked', () => {
    setQueryResult({ data: [buildUserSpace({ name: 'Frontend' })] });
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    const bar = screen.getByTestId('spaces-bulk-action-bar');
    expect(within(bar).getByText('1 selected')).toBeInTheDocument();
  });

  it('hides the bulk action bar after clicking "clear"', () => {
    setQueryResult({ data: [buildUserSpace({ name: 'Frontend' })] });
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(
      screen.queryByTestId('spaces-bulk-action-bar'),
    ).not.toBeInTheDocument();
  });

  it('hides the pagination footer when total spaces fit on a single page', () => {
    setQueryResult({ data: [buildUserSpace({ name: 'Frontend' })] });
    renderPage();
    expect(screen.queryByText(/showing/i)).not.toBeInTheDocument();
  });

  it('renders only the first page of spaces when there are more than one page', () => {
    const data = Array.from({ length: 12 }, (_, i) =>
      buildUserSpace({
        id: createSpaceId(
          `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        ),
        name: `Space ${i + 1}`,
        slug: `space-${i + 1}`,
      }),
    );
    setQueryResult({ data });
    renderPage();
    expect(screen.getByText(/showing 1.*8 of 12/i)).toBeInTheDocument();
    expect(screen.getByText('Space 1')).toBeInTheDocument();
    expect(screen.getByText('Space 8')).toBeInTheDocument();
    expect(screen.queryByText('Space 9')).not.toBeInTheDocument();
  });
});
