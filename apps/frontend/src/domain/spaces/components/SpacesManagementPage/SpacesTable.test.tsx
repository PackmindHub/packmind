import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createSpaceId,
  SpaceType,
} from '@packmind/types';
import { SpacesTable } from './SpacesTable';
import type { SpaceListItem } from './types';

const pmTableSpy = jest.fn();

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  return {
    ...actual,
    PMTable: (props: {
      columns: { key: string; header: React.ReactNode }[];
      data: Record<string, React.ReactNode>[];
      selectable?: boolean;
      selectedRows?: unknown;
      onSelectionChange?: unknown;
      getRowId?: unknown;
    }) => {
      pmTableSpy(props);
      return (
        <table>
          <thead>
            <tr>
              {props.columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.data.map((row, index) => (
              <tr key={index}>
                {props.columns.map((col) => (
                  <td key={col.key}>{row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    },
  };
});

const buildRow = (overrides: Partial<SpaceListItem> = {}): SpaceListItem => ({
  id: createSpaceId('00000000-0000-0000-0000-000000000001'),
  name: 'Engineering',
  slug: 'engineering',
  organizationId: createOrganizationId('11111111-1111-1111-1111-111111111111'),
  isDefaultSpace: false,
  type: SpaceType.open,
  createdAt: '2025-01-12T00:00:00.000Z',
  colorToken: 'blue',
  isOrgWide: false,
  admins: [],
  membersCount: 0,
  artifactsCount: 0,
  ...overrides,
});

const renderWithProvider = (ui: React.ReactElement) =>
  render(<UIProvider>{ui}</UIProvider>);

describe('SpacesTable', () => {
  beforeEach(() => {
    pmTableSpy.mockClear();
  });

  it('renders the expected columns', () => {
    renderWithProvider(<SpacesTable spaces={[buildRow()]} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Artifacts')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('does not enable PMTable selection or pass selection handlers', () => {
    renderWithProvider(<SpacesTable spaces={[buildRow()]} />);

    expect(pmTableSpy).toHaveBeenCalledTimes(1);
    const props = pmTableSpy.mock.calls[0][0];
    expect(props.selectable).toBeUndefined();
    expect(props.selectedRows).toBeUndefined();
    expect(props.onSelectionChange).toBeUndefined();
    expect(props.getRowId).toBeUndefined();
  });

  it('does not render a row-selection checkbox', () => {
    renderWithProvider(<SpacesTable spaces={[buildRow()]} />);

    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('renders one row per space', () => {
    renderWithProvider(
      <SpacesTable
        spaces={[
          buildRow({
            id: createSpaceId('00000000-0000-0000-0000-000000000001'),
            name: 'Engineering',
          }),
          buildRow({
            id: createSpaceId('00000000-0000-0000-0000-000000000002'),
            name: 'Product',
          }),
        ]}
      />,
    );

    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Product')).toBeInTheDocument();
  });
});
