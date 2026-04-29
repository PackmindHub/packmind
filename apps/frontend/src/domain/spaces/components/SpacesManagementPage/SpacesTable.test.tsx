import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createSpaceId,
  SpaceType,
} from '@packmind/types';
import { SpacesTable } from './SpacesTable';
import type { SpaceListItem } from './types';

jest.mock(
  '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
  () => ({
    ...jest.requireActual(
      '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
    ),
    useDeleteSpaceMutation: jest.fn(() => ({
      mutate: jest.fn(),
      isPending: false,
    })),
  }),
);

jest.mock('../../../accounts/hooks/useAuthContext', () => ({
  ...jest.requireActual('../../../accounts/hooks/useAuthContext'),
  useAuthContext: () => ({
    organization: { id: 'org-1', slug: 'test-org' },
  }),
}));

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
  color: 'blue',
  isDefaultSpace: false,
  admins: [],
  membersCount: 0,
  artifactsCount: 0,
  ...overrides,
});

const renderWithProvider = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <UIProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </UIProvider>,
  );
};

describe('SpacesTable', () => {
  beforeEach(() => {
    pmTableSpy.mockClear();
  });

  it('renders the expected columns', () => {
    renderWithProvider(<SpacesTable spaces={[buildRow()]} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('Collaborators')).toBeInTheDocument();
    // expect(screen.getByText('Artifacts')).toBeInTheDocument();
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

  it('calls onSelectSpace with the space when the row body is clicked', async () => {
    const user = userEvent.setup();
    const onSelectSpace = jest.fn();
    const space = buildRow({ name: 'Engineering' });

    renderWithProvider(
      <SpacesTable spaces={[space]} onSelectSpace={onSelectSpace} />,
    );

    await user.click(screen.getByText('Engineering'));

    expect(onSelectSpace).toHaveBeenCalledTimes(1);
    expect(onSelectSpace).toHaveBeenCalledWith(space);
  });

  it('does not call onSelectSpace when the kebab action button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectSpace = jest.fn();
    const space = buildRow({ name: 'Engineering' });

    renderWithProvider(
      <SpacesTable spaces={[space]} onSelectSpace={onSelectSpace} />,
    );

    await user.click(screen.getByRole('button', { name: /actions/i }));

    expect(onSelectSpace).not.toHaveBeenCalled();
  });
});
