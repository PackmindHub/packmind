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
    it('renders table with columns and data', () => {
      renderPMTable({ columns: mockColumns, data: mockData });

      // Check headers are rendered
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Check data is rendered
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders empty table when no data provided', () => {
      renderPMTable({ columns: mockColumns, data: [] });

      // Headers should still be rendered
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // No data rows should be rendered
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('column configuration', () => {
    it('renders columns in correct order', () => {
      renderPMTable({ columns: mockColumns, data: mockData });

      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(4);
      expect(headers[0]).toHaveTextContent('Name');
      expect(headers[1]).toHaveTextContent('Email');
      expect(headers[2]).toHaveTextContent('Role');
      expect(headers[3]).toHaveTextContent('Status');
    });

    it('renders data in correct column order', () => {
      renderPMTable({ columns: mockColumns, data: mockData });

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      const firstDataRow = rows[1];
      const cells = firstDataRow.querySelectorAll('td');

      expect(cells[0]).toHaveTextContent('John Doe');
      expect(cells[1]).toHaveTextContent('john@example.com');
      expect(cells[2]).toHaveTextContent('Admin');
      expect(cells[3]).toHaveTextContent('Active');
    });

    it('handles missing data keys gracefully', () => {
      const incompleteData: PMTableRow[] = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          // Missing role and status
        },
      ];

      renderPMTable({ columns: mockColumns, data: incompleteData });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      // Missing fields should render as empty cells
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      const cells = firstDataRow.querySelectorAll('td');
      expect(cells[2]).toHaveTextContent('');
      expect(cells[3]).toHaveTextContent('');
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

    it('renders table with growing columns', () => {
      renderPMTable({ columns: growingColumns, data: growingData });

      // Check that all columns are rendered
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      // Check that data is rendered
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(
        screen.getByText('A comprehensive project management system'),
      ).toBeInTheDocument();
      expect(screen.getByText('Software Development')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('handles all growing columns', () => {
      const allGrowingColumns: PMTableColumn[] = [
        { key: 'name', header: 'Name', grow: true },
        { key: 'email', header: 'Email', grow: true },
        { key: 'role', header: 'Role', grow: true },
      ];

      renderPMTable({ columns: allGrowingColumns, data: mockData });

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('handles all fixed columns', () => {
      const allFixedColumns: PMTableColumn[] = [
        { key: 'name', header: 'Name', width: '200px', grow: false },
        { key: 'email', header: 'Email', width: '250px', grow: false },
        { key: 'role', header: 'Role', width: '150px', grow: false },
      ];

      renderPMTable({ columns: allFixedColumns, data: mockData });

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
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
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('handles large datasets', () => {
      const largeData: PMTableRow[] = Array.from({ length: 100 }, (_, i) => ({
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: i % 2 === 0 ? 'Admin' : 'User',
        status: i % 3 === 0 ? 'Active' : 'Inactive',
      }));

      renderPMTable({ columns: mockColumns, data: largeData });

      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 100')).toBeInTheDocument();
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('user100@example.com')).toBeInTheDocument();
    });

    it('handles numeric and boolean values', () => {
      const mixedData: PMTableRow[] = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          role: 123,
          status: 'true', // Convert boolean to string for React rendering
        },
      ];

      renderPMTable({ columns: mockColumns, data: mixedData });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty columns array', () => {
      renderPMTable({ columns: [], data: mockData });

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // No headers should be rendered
      const headers = screen.queryAllByRole('columnheader');
      expect(headers).toHaveLength(0);
    });

    it('handles undefined and null values', () => {
      const dataWithNullValues: PMTableRow[] = [
        {
          name: 'John Doe',
          email: null,
          role: undefined,
          status: '',
        },
      ];

      renderPMTable({ columns: mockColumns, data: dataWithNullValues });

      expect(screen.getByText('John Doe')).toBeInTheDocument();

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      const cells = firstDataRow.querySelectorAll('td');

      expect(cells[0]).toHaveTextContent('John Doe');
      expect(cells[1]).toHaveTextContent(''); // null renders as empty
      expect(cells[2]).toHaveTextContent(''); // undefined renders as empty
      expect(cells[3]).toHaveTextContent(''); // empty string renders as empty
    });

    it('handles columns with no key specified', () => {
      const columnsWithoutKey: PMTableColumn[] = [
        { key: 'name', header: 'Name' },
        { key: 'nonexistent', header: 'Non-existent' },
      ];

      renderPMTable({ columns: columnsWithoutKey, data: mockData });

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Non-existent')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      const cells = firstDataRow.querySelectorAll('td');

      expect(cells[0]).toHaveTextContent('John Doe');
      expect(cells[1]).toHaveTextContent(''); // Non-existent key renders as empty
    });
  });

  describe('selection functionality', () => {
    it('renders without selection column by default', () => {
      renderPMTable({ columns: mockColumns, data: mockData });

      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(4); // Only the 4 data columns

      // No checkboxes should be present
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes).toHaveLength(0);
    });

    it('renders selection column when selectable is true', () => {
      renderPMTable({
        columns: mockColumns,
        data: mockData,
        selectable: true,
        getRowId,
      });

      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(5); // Selection column + 4 data columns

      // Should have select all checkbox + 2 row checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
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
      const firstRowCheckbox = checkboxes[1]; // Index 0 is select all

      // Click the first row checkbox
      fireEvent.click(firstRowCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith(
        new Set<string | number>(['user-1']),
      );
    });

    it('handles multiple row selection', () => {
      const onSelectionChange = jest.fn();
      let selectedRows = new Set<string | number>();

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

      const getCheckboxes = () => screen.getAllByRole('checkbox');

      // Select first row
      fireEvent.click(getCheckboxes()[1]);
      expect(onSelectionChange).toHaveBeenCalledWith(
        new Set<string | number>(['user-1']),
      );

      // Rerender with updated state
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

      // Select second row
      fireEvent.click(getCheckboxes()[2]);
      expect(onSelectionChange).toHaveBeenCalledWith(
        new Set<string | number>(['user-1', 'user-2']),
      );
    });

    it('handles row deselection', () => {
      const onSelectionChange = jest.fn();

      renderPMTable({
        columns: mockColumns,
        data: mockData,
        selectable: true,
        selectedRows: new Set<string | number>(['user-1']),
        onSelectionChange,
        getRowId,
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstRowCheckbox = checkboxes[1];

      // First row should be checked
      expect(firstRowCheckbox).toBeChecked();

      // Click to deselect
      fireEvent.click(firstRowCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith(
        new Set<string | number>(),
      );
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

      // Click select all
      fireEvent.click(selectAllCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith(
        new Set<string | number>(['user-1', 'user-2']),
      );
    });

    it('handles deselect all functionality', () => {
      const onSelectionChange = jest.fn();

      renderPMTable({
        columns: mockColumns,
        data: mockData,
        selectable: true,
        selectedRows: new Set<string | number>(['user-1', 'user-2']),
        onSelectionChange,
        getRowId,
      });

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];

      // Should be checked when all rows are selected
      expect(selectAllCheckbox).toBeChecked();

      // Click to deselect all
      fireEvent.click(selectAllCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith(
        new Set<string | number>(),
      );
    });

    it('works in uncontrolled mode', () => {
      renderPMTable({
        columns: mockColumns,
        data: mockData,
        selectable: true,
        getRowId,
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstRowCheckbox = checkboxes[1];

      // Initially unchecked
      expect(firstRowCheckbox).not.toBeChecked();

      // Click to select
      fireEvent.click(firstRowCheckbox);

      // Should be checked now
      expect(firstRowCheckbox).toBeChecked();
    });

    it('uses custom getRowId when provided', () => {
      const getRowId = jest.fn(
        (row: PMTableRow, index: number) => row.id as string,
      );

      renderPMTable({
        columns: mockColumns,
        data: mockData,
        selectable: true,
        getRowId,
      });

      // getRowId should be called for each row
      expect(getRowId).toHaveBeenCalledWith(mockData[0], 0);
      expect(getRowId).toHaveBeenCalledWith(mockData[1], 1);
    });

    it('uses custom selectAllLabel when provided', () => {
      const customLabel = 'Select All Items';

      renderPMTable({
        columns: mockColumns,
        data: mockData,
        selectable: true,
        selectAllLabel: customLabel,
        getRowId,
      });

      const selectAllCheckbox = screen.getByTestId('pmtable.selectAll');
      expect(selectAllCheckbox).toHaveAttribute('aria-label', customLabel);
    });

    it('handles empty data with selection enabled', () => {
      renderPMTable({
        columns: mockColumns,
        data: [],
        selectable: true,
        getRowId,
      });

      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(5); // Selection column + 4 data columns

      // Should only have select all checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(1);

      // Select all should be unchecked and not indeterminate
      const selectAllCheckbox = checkboxes[0];
      expect(selectAllCheckbox).not.toBeChecked();
      expect(selectAllCheckbox).not.toBePartiallyChecked();
    });

    it('maintains selection state when data changes', () => {
      const onSelectionChange = jest.fn();
      const { rerender } = renderPMTable({
        columns: mockColumns,
        data: mockData,
        selectable: true,
        selectedRows: new Set<string | number>(['user-1']),
        onSelectionChange,
        getRowId,
      });

      // First row should be selected
      const firstRowCheckbox = screen.getAllByRole('checkbox')[1];
      expect(firstRowCheckbox).toBeChecked();

      // Update with new data
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

      // Selection should be maintained
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4); // select all + 3 rows
      expect(checkboxes[1]).toBeChecked(); // First row still selected
      expect(checkboxes[2]).not.toBeChecked(); // Second row not selected
      expect(checkboxes[3]).not.toBeChecked(); // Third row not selected
    });
  });
});
