import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { SpacesManagementPage } from './SpacesManagementPage';

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

const renderPage = () =>
  render(
    <UIProvider>
      <SpacesManagementPage />
    </UIProvider>,
  );

describe('SpacesManagementPage', () => {
  it('renders the toolbar with the New space button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /new space/i }),
    ).toBeInTheDocument();
  });

  it('renders the first 8 mock spaces from the screenshot', () => {
    renderPage();
    expect(screen.getByText('Global')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Mobile')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });

  it('renders the org-wide badge on the Global space row', () => {
    renderPage();
    expect(screen.getByText(/org-wide/i)).toBeInTheDocument();
  });

  it('hides the bulk action bar by default', () => {
    renderPage();
    expect(
      screen.queryByTestId('spaces-bulk-action-bar'),
    ).not.toBeInTheDocument();
  });

  it('reveals the bulk action bar with "1 selected" when a row checkbox is checked', () => {
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    const bar = screen.getByTestId('spaces-bulk-action-bar');
    expect(within(bar).getByText('1 selected')).toBeInTheDocument();
  });

  it('hides the bulk action bar after clicking "clear"', () => {
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(
      screen.queryByTestId('spaces-bulk-action-bar'),
    ).not.toBeInTheDocument();
  });

  it('renders the pagination footer with "Showing 1-8 of 32"', () => {
    renderPage();
    expect(screen.getByText(/showing 1.*8 of 32/i)).toBeInTheDocument();
  });
});
