import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecipesList } from './RecipesList';
import {
  useGetRecipesQuery,
  useDeleteRecipesBatchMutation,
} from '../api/queries/RecipesQueries';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useGetGroupedChangeProposalsQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';

// CJS/ESM interop fix: `import React from 'react'` in jest ESM mode gets
// module.exports.default (undefined) instead of module.exports.
// Wrapping with __esModule:true makes the default import work correctly.
jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');
  return { __esModule: true, ...actual, default: actual };
});

jest.mock('../api/queries/RecipesQueries', () => ({
  useGetRecipesQuery: jest.fn(),
  useDeleteRecipesBatchMutation: jest.fn(),
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

jest.mock('./RecipesBlankState', () => ({
  RecipesBlankState: () => null,
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

const mockRecipes = [
  {
    id: 'recipe-1',
    name: 'Alpha Command',
    version: 1,
    updatedAt: new Date().toISOString(),
    createdBy: { displayName: 'Alice' },
  },
  {
    id: 'recipe-2',
    name: 'Beta Command',
    version: 2,
    updatedAt: new Date().toISOString(),
    createdBy: { displayName: 'Bob' },
  },
  {
    id: 'recipe-3',
    name: 'Gamma Command',
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

describe('RecipesList', () => {
  beforeEach(() => {
    (useGetRecipesQuery as jest.Mock).mockReturnValue({
      data: mockRecipes,
      isLoading: false,
      isError: false,
    });
    (useDeleteRecipesBatchMutation as jest.Mock).mockReturnValue({
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
    it('only selects filtered commands when clicking the header checkbox', async () => {
      renderWithProviders(<RecipesList orgSlug="my-org" />);

      const searchInput = screen.getByPlaceholderText('Search by name...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      });

      expect(screen.getByText('Alpha Command')).toBeInTheDocument();
      expect(screen.queryByText('Beta Command')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Command')).not.toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      expect(screen.getByText('Delete (1)')).toBeInTheDocument();
    });

    it('does not select commands that were filtered out', async () => {
      renderWithProviders(<RecipesList orgSlug="my-org" />);

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

    it('selects all commands when no filter is applied', async () => {
      renderWithProviders(<RecipesList orgSlug="my-org" />);

      const checkboxes = screen.getAllByRole('checkbox');
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      expect(screen.getByText('Delete (3)')).toBeInTheDocument();
    });
  });
});
