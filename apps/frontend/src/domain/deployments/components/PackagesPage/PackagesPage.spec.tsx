import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PackagesPage } from './PackagesPage';
import {
  useListPackagesBySpaceQuery,
  useDeletePackagesBatchMutation,
} from '../../api/queries/DeploymentsQueries';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';

// CJS/ESM interop fix: `import React from 'react'` in jest ESM mode gets
// module.exports.default (undefined) instead of module.exports.
// Wrapping with __esModule:true makes the default import work correctly.
jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');
  return { __esModule: true, ...actual, default: actual };
});

jest.mock('../../api/queries/DeploymentsQueries', () => ({
  useListPackagesBySpaceQuery: jest.fn(),
  useDeletePackagesBatchMutation: jest.fn(),
}));

jest.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: jest.fn(),
}));

jest.mock('../../../git/api/queries/GitProviderQueries', () => ({
  useGetGitProvidersQuery: jest.fn(),
}));

jest.mock('react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

jest.mock('../PackagesBlankState', () => ({
  PackagesBlankState: () => null,
}));

jest.mock('../PackageDeployments/DeployPackageButton', () => ({
  DeployPackageButton: () => null,
}));

jest.mock('@packmind/ui', () => ({
  PMBox: ({
    children,
  }: React.PropsWithChildren<{ as?: string; mb?: number }>) => (
    <div>{children}</div>
  ),
  PMLink: ({
    children,
    asChild,
  }: React.PropsWithChildren<{ asChild?: boolean }>) =>
    asChild ? <>{children}</> : <a>{children}</a>,
  PMText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  PMButton: ({
    children,
    onClick,
    disabled,
  }: React.PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: string;
  }>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  PMButtonGroup: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
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
    Content: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    Title: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
    Description: ({ children }: React.PropsWithChildren) => (
      <span>{children}</span>
    ),
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
  PMTooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useTableSort: () => ({
    sortKey: 'name',
    sortDirection: 'asc',
    handleSort: jest.fn(),
    getSortDirection: () => undefined,
  }),
}));

const mockPackages = [
  {
    id: 'pkg-1',
    name: 'Alpha Package',
    recipes: [],
    standards: [],
    skills: [],
  },
  { id: 'pkg-2', name: 'Beta Package', recipes: [], standards: [], skills: [] },
  {
    id: 'pkg-3',
    name: 'Gamma Package',
    recipes: [],
    standards: [],
    skills: [],
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

describe('PackagesPage', () => {
  beforeEach(() => {
    (useListPackagesBySpaceQuery as jest.Mock).mockReturnValue({
      data: { packages: mockPackages },
      isLoading: false,
      isError: false,
    });
    (useDeletePackagesBatchMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    (useCurrentSpace as jest.Mock).mockReturnValue({
      spaceId: 'space-1',
      space: { organizationId: 'org-1' },
      isLoading: false,
    });
    (useGetGitProvidersQuery as jest.Mock).mockReturnValue({
      data: { providers: [] },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('select all with active search filter', () => {
    it('only selects filtered packages when clicking the header checkbox', async () => {
      renderWithProviders(
        <PackagesPage orgSlug="my-org" spaceSlug="my-space" />,
      );

      const searchInput = screen.getByPlaceholderText('Search by name...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      });

      expect(screen.getByText('Alpha Package')).toBeInTheDocument();
      expect(screen.queryByText('Beta Package')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Package')).not.toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      expect(screen.getByText('Delete (1)')).toBeInTheDocument();
    });

    it('does not select packages that were filtered out', async () => {
      renderWithProviders(
        <PackagesPage orgSlug="my-org" spaceSlug="my-space" />,
      );

      const searchInput = screen.getByPlaceholderText('Search by name...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Beta' } });
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      expect(screen.getByText('Delete (1)')).toBeInTheDocument();
    });

    it('selects all packages when no filter is applied', async () => {
      renderWithProviders(
        <PackagesPage orgSlug="my-org" spaceSlug="my-space" />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      expect(screen.getByText('Delete (3)')).toBeInTheDocument();
    });
  });
});
