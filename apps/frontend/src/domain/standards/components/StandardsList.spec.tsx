import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StandardsList } from './StandardsList';
import {
  useGetStandardsQuery,
  useDeleteStandardsBatchMutation,
} from '../api/queries/StandardsQueries';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useGetGroupedChangeProposalsQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';

jest.mock('../api/queries/StandardsQueries', () => ({
  useGetStandardsQuery: jest.fn(),
  useDeleteStandardsBatchMutation: jest.fn(),
}));

jest.mock('../../deployments/api/queries/DeploymentsQueries', () => ({
  useListPackagesBySpaceQuery: jest.fn(),
}));

jest.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: jest.fn(),
}));

jest.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  () => ({
    useGetGroupedChangeProposalsQuery: jest.fn(),
  }),
);

jest.mock(
  '@packmind/proprietary/frontend/domain/spaces-management/components/SpacesManagementActions',
  () => ({
    SpacesManagementActions: () => null,
  }),
);

jest.mock('../../deployments/components/PackageCountBadge', () => ({
  PackageCountBadge: () => null,
  formatPackageNames: jest.fn(() => ''),
}));

jest.mock('../../deployments/hooks/usePackagesForArtifact', () => ({
  getArtifactPackages: jest.fn(() => []),
}));

jest.mock('react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

jest.mock('./StandardsBlankState', () => ({
  StandardsBlankState: () => null,
}));

jest.mock('./StandardSamplesModal', () => ({
  StandardSamplesModal: () => null,
}));

jest.mock('../../accounts/components/UserAvatarWithInitials', () => ({
  UserAvatarWithInitials: ({ displayName }: { displayName: string }) => (
    <span>{displayName}</span>
  ),
}));

jest.mock('@packmind/ui', () => ({
  PMBox: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  PMHStack: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  PMLink: ({
    children,
    asChild,
  }: React.PropsWithChildren<{ asChild?: boolean }>) =>
    asChild ? <>{children}</> : <a>{children}</a>,
  PMButton: ({
    children,
    onClick,
    disabled,
  }: React.PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
  }>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  PMTable: ({
    columns,
    data,
  }: {
    columns: Array<{ key: string; header: React.ReactNode }>;
    data: Array<Record<string, React.ReactNode>>;
    onSort?: (key: string) => void;
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
        {data.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={col.key}>{row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  PMAlert: {
    Root: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    Indicator: () => null,
    Title: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  },
  PMAlertDialog: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
  PMCheckbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (event: { checked: boolean | string }) => void;
    controlProps?: object;
  }) => (
    <input
      type="checkbox"
      checked={checked ?? false}
      onChange={(e) => onCheckedChange?.({ checked: e.target.checked })}
      readOnly={!onCheckedChange}
    />
  ),
  PMInput: ({
    placeholder,
    value,
    onChange,
  }: {
    placeholder?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }) => <input placeholder={placeholder} value={value} onChange={onChange} />,
  PMBadge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  useTableSort: () => ({
    sortKey: 'name',
    sortDirection: 'asc',
    handleSort: jest.fn(),
    getSortDirection: () => undefined,
  }),
}));

const mockStandards = [
  {
    id: 'standard-1',
    name: 'Alpha Standard',
    version: 1,
    updatedAt: new Date().toISOString(),
    createdBy: { displayName: 'Alice' },
  },
  {
    id: 'standard-2',
    name: 'Beta Standard',
    version: 2,
    updatedAt: new Date().toISOString(),
    createdBy: { displayName: 'Bob' },
  },
  {
    id: 'standard-3',
    name: 'Gamma Standard',
    version: 3,
    updatedAt: new Date().toISOString(),
    createdBy: { displayName: 'Carol' },
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
};

describe('StandardsList', () => {
  beforeEach(() => {
    (useGetStandardsQuery as jest.Mock).mockReturnValue({
      data: { standards: mockStandards },
      isLoading: false,
      isError: false,
    });
    (useDeleteStandardsBatchMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    (useListPackagesBySpaceQuery as jest.Mock).mockReturnValue({
      data: { packages: [] },
    });
    (useCurrentSpace as jest.Mock).mockReturnValue({
      spaceId: 'space-1',
      spaceSlug: 'my-space',
    });
    (useAuthContext as jest.Mock).mockReturnValue({
      organization: { id: 'org-1' },
    });
    (useGetGroupedChangeProposalsQuery as jest.Mock).mockReturnValue({
      data: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('select all with active search filter', () => {
    it('only selects filtered standards when clicking the header checkbox', async () => {
      renderWithProviders(<StandardsList orgSlug="my-org" />);

      const searchInput = screen.getByPlaceholderText('Search by name...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      });

      // Only "Alpha Standard" is visible after filtering
      expect(screen.getByText('Alpha Standard')).toBeInTheDocument();
      expect(screen.queryByText('Beta Standard')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Standard')).not.toBeInTheDocument();

      // Click the header "select all" checkbox (first checkbox = header)
      const checkboxes = screen.getAllByRole('checkbox');
      const headerCheckbox = checkboxes[0];
      await act(async () => {
        fireEvent.click(headerCheckbox);
      });

      // Delete button should show count of 1, not 3
      expect(screen.getByText('Delete (1)')).toBeInTheDocument();
    });

    it('does not select standards that were filtered out', async () => {
      renderWithProviders(<StandardsList orgSlug="my-org" />);

      const searchInput = screen.getByPlaceholderText('Search by name...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Beta' } });
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const headerCheckbox = checkboxes[0];
      await act(async () => {
        fireEvent.click(headerCheckbox);
      });

      // Only Beta Standard selected (count = 1, not 3)
      expect(screen.getByText('Delete (1)')).toBeInTheDocument();
    });

    it('selects all standards when no filter is applied', async () => {
      renderWithProviders(<StandardsList orgSlug="my-org" />);

      const checkboxes = screen.getAllByRole('checkbox');
      const headerCheckbox = checkboxes[0];
      await act(async () => {
        fireEvent.click(headerCheckbox);
      });

      // All 3 standards selected
      expect(screen.getByText('Delete (3)')).toBeInTheDocument();
    });
  });
});
