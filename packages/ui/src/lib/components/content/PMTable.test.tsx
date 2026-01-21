import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PMTable, PMTableColumn, PMTableRow } from './PMTable';
import { UIProvider } from '../../UIProvider';

// Helper function to render component with Chakra UI context
const renderPMTable = (props: React.ComponentProps<typeof PMTable>) => {
  return render(
    <UIProvider>
      <PMTable {...props} />
    </UIProvider>,
  );
};

describe('PMTable', () => {
  const mockColumns: PMTableColumn[] = [
    { key: 'name', header: 'Name', width: '200px', align: 'left' },
    { key: 'email', header: 'Email', width: '250px', align: 'left' },
    { key: 'role', header: 'Role', width: '150px', align: 'center' },
    { key: 'status', header: 'Status', width: '100px', align: 'right' },
  ];

  const mockData: PMTableRow[] = [
    {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      status: 'Active',
    },
    {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'User',
      status: 'Inactive',
    },
  ];

  const getRowId = (row: PMTableRow, _index: number) => row.id as string;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    describe('renders table with columns and data', () => {
      beforeEach(() => {
        renderPMTable({ columns: mockColumns, data: mockData });
      });

      it('renders Name header', () => {
        expect(screen.getByText('Name')).toBeInTheDocument();
      });

      it('renders Email header', () => {
        expect(screen.getByText('Email')).toBeInTheDocument();
      });

      it('renders Role header', () => {
        expect(screen.getByText('Role')).toBeInTheDocument();
      });

      it('renders Status header', () => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });

      it('renders first user name', () => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      it('renders first user email', () => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      it('renders first user role', () => {
        expect(screen.getByText('Admin')).toBeInTheDocument();
      });

      it('renders first user status', () => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      it('renders second user name', () => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      it('renders second user email', () => {
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });

      it('renders second user role', () => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });

      it('renders second user status', () => {
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });
    });

    describe('when no data provided', () => {
      beforeEach(() => {
        renderPMTable({ columns: mockColumns, data: [] });
      });

      it('renders Name header', () => {
        expect(screen.getByText('Name')).toBeInTheDocument();
      });

      it('renders Email header', () => {
        expect(screen.getByText('Email')).toBeInTheDocument();
      });

      it('renders Role header', () => {
        expect(screen.getByText('Role')).toBeInTheDocument();
      });

      it('renders Status header', () => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });

      it('does not render first user data', () => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });

      it('does not render second user data', () => {
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });
  });

  describe('column configuration', () => {
    describe('renders columns in correct order', () => {
      let headers: HTMLElement[];

      beforeEach(() => {
        renderPMTable({ columns: mockColumns, data: mockData });
        headers = screen.getAllByRole('columnheader');
      });

      it('renders four column headers', () => {
        expect(headers).toHaveLength(4);
      });

      it('renders Name as first header', () => {
        expect(headers[0]).toHaveTextContent('Name');
      });

      it('renders Email as second header', () => {
        expect(headers[1]).toHaveTextContent('Email');
      });

      it('renders Role as third header', () => {
        expect(headers[2]).toHaveTextContent('Role');
      });

      it('renders Status as fourth header', () => {
        expect(headers[3]).toHaveTextContent('Status');
      });
    });

    describe('renders data in correct column order', () => {
      let cells: NodeListOf<HTMLTableCellElement>;

      beforeEach(() => {
        renderPMTable({ columns: mockColumns, data: mockData });
        const rows = screen.getAllByRole('row');
        const firstDataRow = rows[1];
        cells = firstDataRow.querySelectorAll('td');
      });

      it('renders name in first cell', () => {
        expect(cells[0]).toHaveTextContent('John Doe');
      });

      it('renders email in second cell', () => {
        expect(cells[1]).toHaveTextContent('john@example.com');
      });

      it('renders role in third cell', () => {
        expect(cells[2]).toHaveTextContent('Admin');
      });

      it('renders status in fourth cell', () => {
        expect(cells[3]).toHaveTextContent('Active');
      });
    });

    describe('handles missing data keys gracefully', () => {
      let cells: NodeListOf<HTMLTableCellElement>;

      beforeEach(() => {
        const incompleteData: PMTableRow[] = [
          {
            name: 'John Doe',
            email: 'john@example.com',
          },
        ];

        renderPMTable({ columns: mockColumns, data: incompleteData });
        const rows = screen.getAllByRole('row');
        const firstDataRow = rows[1];
        cells = firstDataRow.querySelectorAll('td');
      });

      it('renders available name', () => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      it('renders available email', () => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      it('renders empty cell for missing role', () => {
        expect(cells[2]).toHaveTextContent('');
      });

      it('renders empty cell for missing status', () => {
        expect(cells[3]).toHaveTextContent('');
      });
    });
  });

  describe('grow functionality', () => {
    const growingColumns: PMTableColumn[] = [
      { key: 'id', header: 'ID', width: '60px', grow: false },
      { key: 'name', header: 'Name', width: '150px', grow: false },
      { key: 'description', header: 'Description', grow: true },
      { key: 'category', header: 'Category', grow: true },
      { key: 'actions', header: 'Actions', width: '100px', grow: false },
    ];

    const growingData: PMTableRow[] = [
      {
        id: '1',
        name: 'Project Alpha',
        description: 'A comprehensive project management system',
        category: 'Software Development',
        actions: 'Edit',
      },
    ];

    describe('renders table with growing columns', () => {
      beforeEach(() => {
        renderPMTable({ columns: growingColumns, data: growingData });
      });

      it('renders ID column', () => {
        expect(screen.getByText('ID')).toBeInTheDocument();
      });

      it('renders Name column', () => {
        expect(screen.getByText('Name')).toBeInTheDocument();
      });

      it('renders Description column', () => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      it('renders Category column', () => {
        expect(screen.getByText('Category')).toBeInTheDocument();
      });

      it('renders Actions column', () => {
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });

      it('renders id data', () => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });

      it('renders name data', () => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });

      it('renders description data', () => {
        expect(
          screen.getByText('A comprehensive project management system'),
        ).toBeInTheDocument();
      });

      it('renders category data', () => {
        expect(screen.getByText('Software Development')).toBeInTheDocument();
      });

      it('renders actions data', () => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
    });

    describe('handles all growing columns', () => {
      const allGrowingColumns: PMTableColumn[] = [
        { key: 'name', header: 'Name', grow: true },
        { key: 'email', header: 'Email', grow: true },
        { key: 'role', header: 'Role', grow: true },
      ];

      beforeEach(() => {
        renderPMTable({ columns: allGrowingColumns, data: mockData });
      });

      it('renders Name header', () => {
        expect(screen.getByText('Name')).toBeInTheDocument();
      });

      it('renders Email header', () => {
        expect(screen.getByText('Email')).toBeInTheDocument();
      });

      it('renders Role header', () => {
        expect(screen.getByText('Role')).toBeInTheDocument();
      });

      it('renders name data', () => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      it('renders email data', () => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      it('renders role data', () => {
        expect(screen.getByText('Admin')).toBeInTheDocument();
      });
    });

    describe('handles all fixed columns', () => {
      const allFixedColumns: PMTableColumn[] = [
        { key: 'name', header: 'Name', width: '200px', grow: false },
        { key: 'email', header: 'Email', width: '250px', grow: false },
        { key: 'role', header: 'Role', width: '150px', grow: false },
      ];

      beforeEach(() => {
        renderPMTable({ columns: allFixedColumns, data: mockData });
      });

      it('renders Name header', () => {
        expect(screen.getByText('Name')).toBeInTheDocument();
      });

      it('renders Email header', () => {
        expect(screen.getByText('Email')).toBeInTheDocument();
      });

      it('renders Role header', () => {
        expect(screen.getByText('Role')).toBeInTheDocument();
      });

      it('renders name data', () => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      it('renders email data', () => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      it('renders role data', () => {
        expect(screen.getByText('Admin')).toBeInTheDocument();
      });
    });
  });

  describe('table props', () => {
    it('renders with default props', () => {
      renderPMTable({ columns: mockColumns, data: mockData });

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('renders with small size', () => {
      renderPMTable({ columns: mockColumns, data: mockData, size: 'sm' });

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('renders with large size', () => {
      renderPMTable({ columns: mockColumns, data: mockData, size: 'lg' });

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('renders with outline variant', () => {
      renderPMTable({
        columns: mockColumns,
        data: mockData,
        variant: 'outline',
      });

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('renders with striped disabled', () => {
      renderPMTable({ columns: mockColumns, data: mockData, striped: false });

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('renders with hover disabled', () => {
      renderPMTable({ columns: mockColumns, data: mockData, hoverable: false });

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('renders with column borders', () => {
      renderPMTable({
        columns: mockColumns,
        data: mockData,
        showColumnBorder: true,
      });

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('data handling', () => {
    it('handles React node content', () => {
      const dataWithReactNodes: PMTableRow[] = [
        {
          name: <strong>John Doe</strong>,
          email: <em>john@example.com</em>,
          role: 'Admin',
          status: <span style={{ color: 'green' }}>Active</span>,
        },
      ];

      renderPMTable({ columns: mockColumns, data: dataWithReactNodes });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    describe('handles large datasets', () => {
      let largeData: PMTableRow[];

      beforeEach(() => {
        largeData = Array.from({ length: 100 }, (_, i) => ({
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          role: i % 2 === 0 ? 'Admin' : 'User',
          status: i % 3 === 0 ? 'Active' : 'Inactive',
        }));

        renderPMTable({ columns: mockColumns, data: largeData });
      });

      it('renders first user', () => {
        expect(screen.getByText('User 1')).toBeInTheDocument();
      });

      it('renders last user', () => {
        expect(screen.getByText('User 100')).toBeInTheDocument();
      });

      it('renders first user email', () => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      });

      it('renders last user email', () => {
        expect(screen.getByText('user100@example.com')).toBeInTheDocument();
      });
    });

    it('handles numeric and boolean values', () => {
      const mixedData: PMTableRow[] = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          role: 123,
          status: 'true',
        },
      ];

      renderPMTable({ columns: mockColumns, data: mixedData });

      expect(screen.getByText('123')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    describe('handles empty columns array', () => {
      beforeEach(() => {
        renderPMTable({ columns: [], data: mockData });
      });

      it('renders table element', () => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });

      it('renders no column headers', () => {
        const headers = screen.queryAllByRole('columnheader');
        expect(headers).toHaveLength(0);
      });
    });

    describe('handles undefined and null values', () => {
      let cells: NodeListOf<HTMLTableCellElement>;

      beforeEach(() => {
        const dataWithNullValues: PMTableRow[] = [
          {
            name: 'John Doe',
            email: null,
            role: undefined,
            status: '',
          },
        ];

        renderPMTable({ columns: mockColumns, data: dataWithNullValues });

        const rows = screen.getAllByRole('row');
        const firstDataRow = rows[1];
        cells = firstDataRow.querySelectorAll('td');
      });

      it('renders name correctly', () => {
        expect(cells[0]).toHaveTextContent('John Doe');
      });

      it('renders null email as empty', () => {
        expect(cells[1]).toHaveTextContent('');
      });

      it('renders undefined role as empty', () => {
        expect(cells[2]).toHaveTextContent('');
      });

      it('renders empty string status as empty', () => {
        expect(cells[3]).toHaveTextContent('');
      });
    });

    describe('handles columns with non-existent key', () => {
      let cells: NodeListOf<HTMLTableCellElement>;

      beforeEach(() => {
        const columnsWithoutKey: PMTableColumn[] = [
          { key: 'name', header: 'Name' },
          { key: 'nonexistent', header: 'Non-existent' },
        ];

        renderPMTable({ columns: columnsWithoutKey, data: mockData });

        const rows = screen.getAllByRole('row');
        const firstDataRow = rows[1];
        cells = firstDataRow.querySelectorAll('td');
      });

      it('renders Name header', () => {
        expect(screen.getByText('Name')).toBeInTheDocument();
      });

      it('renders Non-existent header', () => {
        expect(screen.getByText('Non-existent')).toBeInTheDocument();
      });

      it('renders name data correctly', () => {
        expect(cells[0]).toHaveTextContent('John Doe');
      });

      it('renders non-existent key as empty', () => {
        expect(cells[1]).toHaveTextContent('');
      });
    });
  });

  describe('selection functionality', () => {
    describe('renders without selection column by default', () => {
      beforeEach(() => {
        renderPMTable({ columns: mockColumns, data: mockData });
      });

      it('renders only data column headers', () => {
        const headers = screen.getAllByRole('columnheader');
        expect(headers).toHaveLength(4);
      });

      it('renders no checkboxes', () => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes).toHaveLength(0);
      });
    });

    describe('when selectable is true', () => {
      beforeEach(() => {
        renderPMTable({
          columns: mockColumns,
          data: mockData,
          selectable: true,
          getRowId,
        });
      });

      it('renders selection column header', () => {
        const headers = screen.getAllByRole('columnheader');
        expect(headers).toHaveLength(5);
      });

      it('renders select all and row checkboxes', () => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(3);
      });
    });

    it('handles individual row selection', () => {
      const onSelectionChange = jest.fn();

      renderPMTable({
        columns: mockColumns,
        data: mockData,
        selectable: true,
        onSelectionChange,
        getRowId,
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstRowCheckbox = checkboxes[1];

      fireEvent.click(firstRowCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith(
        new Set<string | number>(['user-1']),
      );
    });

    describe('handles multiple row selection', () => {
      let onSelectionChange: jest.Mock;
      let selectedRows: Set<string | number>;

      beforeEach(() => {
        onSelectionChange = jest.fn();
        selectedRows = new Set<string | number>();
      });

      it('calls onSelectionChange with first row on first selection', () => {
        renderPMTable({
          columns: mockColumns,
          data: mockData,
          selectable: true,
          selectedRows,
          onSelectionChange: (newSelection) => {
            selectedRows = newSelection;
            onSelectionChange(newSelection);
          },
          getRowId,
        });

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[1]);

        expect(onSelectionChange).toHaveBeenCalledWith(
          new Set<string | number>(['user-1']),
        );
      });

      it('calls onSelectionChange with both rows after selecting second', () => {
        const { rerender } = renderPMTable({
          columns: mockColumns,
          data: mockData,
          selectable: true,
          selectedRows,
          onSelectionChange: (newSelection) => {
            selectedRows = newSelection;
            onSelectionChange(newSelection);
          },
          getRowId,
        });

        fireEvent.click(screen.getAllByRole('checkbox')[1]);
        selectedRows = new Set<string | number>(['user-1']);

        rerender(
          <UIProvider>
            <PMTable
              columns={mockColumns}
              data={mockData}
              selectable={true}
              selectedRows={selectedRows}
              onSelectionChange={(newSelection) => {
                selectedRows = newSelection;
                onSelectionChange(newSelection);
              }}
              getRowId={getRowId}
            />
          </UIProvider>,
        );

        fireEvent.click(screen.getAllByRole('checkbox')[2]);

        expect(onSelectionChange).toHaveBeenCalledWith(
          new Set<string | number>(['user-1', 'user-2']),
        );
      });
    });

    describe('handles row deselection', () => {
      let onSelectionChange: jest.Mock;
      let firstRowCheckbox: HTMLElement;

      beforeEach(() => {
        onSelectionChange = jest.fn();

        renderPMTable({
          columns: mockColumns,
          data: mockData,
          selectable: true,
          selectedRows: new Set<string | number>(['user-1']),
          onSelectionChange,
          getRowId,
        });

        const checkboxes = screen.getAllByRole('checkbox');
        firstRowCheckbox = checkboxes[1];
      });

      it('shows first row as checked initially', () => {
        expect(firstRowCheckbox).toBeChecked();
      });

      it('calls onSelectionChange with empty set on deselect', () => {
        fireEvent.click(firstRowCheckbox);

        expect(onSelectionChange).toHaveBeenCalledWith(
          new Set<string | number>(),
        );
      });
    });

    it('handles select all functionality', () => {
      const onSelectionChange = jest.fn();

      renderPMTable({
        columns: mockColumns,
        data: mockData,
        selectable: true,
        onSelectionChange,
        getRowId,
      });

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];

      fireEvent.click(selectAllCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith(
        new Set<string | number>(['user-1', 'user-2']),
      );
    });

    describe('handles deselect all functionality', () => {
      let onSelectionChange: jest.Mock;
      let selectAllCheckbox: HTMLElement;

      beforeEach(() => {
        onSelectionChange = jest.fn();

        renderPMTable({
          columns: mockColumns,
          data: mockData,
          selectable: true,
          selectedRows: new Set<string | number>(['user-1', 'user-2']),
          onSelectionChange,
          getRowId,
        });

        selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      });

      it('shows select all checkbox as checked', () => {
        expect(selectAllCheckbox).toBeChecked();
      });

      it('calls onSelectionChange with empty set on deselect all', () => {
        fireEvent.click(selectAllCheckbox);

        expect(onSelectionChange).toHaveBeenCalledWith(
          new Set<string | number>(),
        );
      });
    });

    describe('works in uncontrolled mode', () => {
      let firstRowCheckbox: HTMLElement;

      beforeEach(() => {
        renderPMTable({
          columns: mockColumns,
          data: mockData,
          selectable: true,
          getRowId,
        });

        const checkboxes = screen.getAllByRole('checkbox');
        firstRowCheckbox = checkboxes[1];
      });

      it('starts with checkbox unchecked', () => {
        expect(firstRowCheckbox).not.toBeChecked();
      });

      it('becomes checked after click', () => {
        fireEvent.click(firstRowCheckbox);

        expect(firstRowCheckbox).toBeChecked();
      });
    });

    describe('when custom getRowId provided', () => {
      let customGetRowId: jest.Mock;

      beforeEach(() => {
        customGetRowId = jest.fn(
          (row: PMTableRow, index: number) => row.id as string,
        );

        renderPMTable({
          columns: mockColumns,
          data: mockData,
          selectable: true,
          getRowId: customGetRowId,
        });
      });

      it('calls getRowId for first row', () => {
        expect(customGetRowId).toHaveBeenCalledWith(mockData[0], 0);
      });

      it('calls getRowId for second row', () => {
        expect(customGetRowId).toHaveBeenCalledWith(mockData[1], 1);
      });
    });

    describe('when custom selectAllLabel provided', () => {
      const customLabel = 'Select All Items';

      beforeEach(() => {
        renderPMTable({
          columns: mockColumns,
          data: mockData,
          selectable: true,
          selectAllLabel: customLabel,
          getRowId,
        });
      });

      it('applies custom aria-label to select all checkbox', () => {
        const selectAllCheckbox = screen.getByTestId('pmtable.selectAll');
        expect(selectAllCheckbox).toHaveAttribute('aria-label', customLabel);
      });
    });

    describe('handles empty data with selection enabled', () => {
      let headers: HTMLElement[];
      let checkboxes: HTMLElement[];

      beforeEach(() => {
        renderPMTable({
          columns: mockColumns,
          data: [],
          selectable: true,
          getRowId,
        });

        headers = screen.getAllByRole('columnheader');
        checkboxes = screen.getAllByRole('checkbox');
      });

      it('renders selection column with data columns', () => {
        expect(headers).toHaveLength(5);
      });

      it('renders only select all checkbox', () => {
        expect(checkboxes).toHaveLength(1);
      });

      it('shows select all as unchecked', () => {
        expect(checkboxes[0]).not.toBeChecked();
      });

      it('shows select all as not partially checked', () => {
        expect(checkboxes[0]).not.toBePartiallyChecked();
      });
    });

    describe('when data changes', () => {
      let onSelectionChange: jest.Mock;
      let rerender: ReturnType<typeof renderPMTable>['rerender'];

      beforeEach(() => {
        onSelectionChange = jest.fn();
        const renderResult = renderPMTable({
          columns: mockColumns,
          data: mockData,
          selectable: true,
          selectedRows: new Set<string | number>(['user-1']),
          onSelectionChange,
          getRowId,
        });
        rerender = renderResult.rerender;
      });

      it('maintains selection for first row', () => {
        const firstRowCheckbox = screen.getAllByRole('checkbox')[1];
        expect(firstRowCheckbox).toBeChecked();
      });

      describe('after adding new data', () => {
        beforeEach(() => {
          const newData = [
            ...mockData,
            {
              id: 'user-3',
              name: 'Bob Wilson',
              email: 'bob@example.com',
              role: 'User',
              status: 'Active',
            },
          ];

          rerender(
            <UIProvider>
              <PMTable
                columns={mockColumns}
                data={newData}
                selectable={true}
                selectedRows={new Set<string | number>(['user-1'])}
                onSelectionChange={onSelectionChange}
                getRowId={getRowId}
              />
            </UIProvider>,
          );
        });

        it('renders correct number of checkboxes', () => {
          const checkboxes = screen.getAllByRole('checkbox');
          expect(checkboxes).toHaveLength(4);
        });

        it('keeps first row selected', () => {
          const checkboxes = screen.getAllByRole('checkbox');
          expect(checkboxes[1]).toBeChecked();
        });

        it('keeps second row unselected', () => {
          const checkboxes = screen.getAllByRole('checkbox');
          expect(checkboxes[2]).not.toBeChecked();
        });

        it('keeps third row unselected', () => {
          const checkboxes = screen.getAllByRole('checkbox');
          expect(checkboxes[3]).not.toBeChecked();
        });
      });
    });
  });
});
