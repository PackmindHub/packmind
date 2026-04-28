import React from 'react';
import { render, screen } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { SpacesManagementPage } from './SpacesManagementPage';
import * as queries from '../../api/queries/SpacesQueries';

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
  useAuthContext: () => ({
    organization: {
      id: 'org-1',
      name: 'Test Organization',
      slug: 'test-org',
      role: 'admin',
    },
  }),
}));

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  return {
    ...actual,
    PMTable: ({
      columns,
      data,
    }: {
      columns: { key: string; header: React.ReactNode }[];
      data: Record<string, React.ReactNode>[];
    }) => (
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col.key}>{row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
  };
});

const buildItem = (overrides: Record<string, unknown> = {}) => ({
  id: 's1',
  name: 'Engineering',
  slug: 'engineering',
  type: 'open',
  organizationId: 'org-1',
  isDefaultSpace: false,
  admins: [],
  membersCount: 0,
  artifactsCount: 0,
  createdAt: '2025-01-12T00:00:00.000Z',
  ...overrides,
});

const renderWithQuery = (ui: React.ReactNode) => {
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

describe('SpacesManagementPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders rows from the new management query', async () => {
    jest
      .spyOn(queries, 'useGetOrganizationSpacesForManagementQuery')
      .mockReturnValue({
        data: {
          items: [buildItem({ name: 'Engineering' })],
          totalCount: 1,
          page: 1,
          pageSize: 8,
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<
        typeof queries.useGetOrganizationSpacesForManagementQuery
      >);

    renderWithQuery(<SpacesManagementPage />);

    expect(await screen.findByText('Engineering')).toBeInTheDocument();
  });

  it('does not render bulk action UI', () => {
    jest
      .spyOn(queries, 'useGetOrganizationSpacesForManagementQuery')
      .mockReturnValue({
        data: { items: [], totalCount: 0, page: 1, pageSize: 8 },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<
        typeof queries.useGetOrganizationSpacesForManagementQuery
      >);

    renderWithQuery(<SpacesManagementPage />);

    expect(screen.queryByTestId('spaces-bulk-action-bar')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /select/i })).toBeNull();
  });

  // it('triggers a refetch with the new page when SpacesPagination calls onPageChange', async () => {
  //   const useQueryMock = jest
  //     .spyOn(queries, 'useGetOrganizationSpacesForManagementQuery')
  //     .mockReturnValue({
  //       data: { items: [], totalCount: 32, page: 1, pageSize: 8 },
  //       isLoading: false,
  //       isError: false,
  //     } as unknown as ReturnType<
  //       typeof queries.useGetOrganizationSpacesForManagementQuery
  //     >);
  //
  //   renderWithQuery(<SpacesManagementPage />);
  //
  //   await userEvent.click(screen.getByRole('button', { name: /next/i }));
  //
  //   expect(useQueryMock).toHaveBeenLastCalledWith(expect.any(String), 2);
  // });
});
