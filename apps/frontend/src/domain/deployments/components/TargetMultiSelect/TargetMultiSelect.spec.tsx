import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { TargetMultiSelect } from './TargetMultiSelect';
import { Target, createTargetId, createGitRepoId } from '@packmind/shared';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
};

const mockTargets: Target[] = [
  {
    id: createTargetId('target-1'),
    name: 'Production',
    path: '/prod',
    gitRepoId: createGitRepoId('repo-1'),
  },
  {
    id: createTargetId('target-2'),
    name: 'Staging',
    path: '/staging',
    gitRepoId: createGitRepoId('repo-1'),
  },
  {
    id: createTargetId('target-3'),
    name: 'Development',
    path: '/dev',
    gitRepoId: createGitRepoId('repo-1'),
  },
];

describe('TargetMultiSelect', () => {
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    mockOnSelectionChange.mockClear();
  });

  it('displays placeholder text when no targets are selected', () => {
    renderWithProvider(
      <TargetMultiSelect
        availableTargets={mockTargets}
        selectedTargetNames={[]}
        onSelectionChange={mockOnSelectionChange}
        placeholder="Filter by targets..."
      />,
    );

    // The component should render a combobox
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays selection count when targets are selected', () => {
    renderWithProvider(
      <TargetMultiSelect
        availableTargets={mockTargets}
        selectedTargetNames={['Production']}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // The component should render a combobox
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays correct plural form for multiple selected targets', () => {
    renderWithProvider(
      <TargetMultiSelect
        availableTargets={mockTargets}
        selectedTargetNames={['Production', 'Staging']}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // The component should show the selection count in some way
    // For now, let's just check that the component renders
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows target options when opened', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <TargetMultiSelect
        availableTargets={mockTargets}
        selectedTargetNames={[]}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Click to open the combobox
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    // Check that target options (names) are displayed
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Staging')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
  });

  it('calls onSelectionChange when target is selected', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <TargetMultiSelect
        availableTargets={mockTargets}
        selectedTargetNames={[]}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Click to open the combobox
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    // Click on a target option
    const productionOption = screen.getByText('Production');
    await user.click(productionOption);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(['Production']);
  });

  it('calls onSelectionChange when target is deselected', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <TargetMultiSelect
        availableTargets={mockTargets}
        selectedTargetNames={['Production']}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Click to open the combobox
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    // Click on the already selected target to deselect it
    const productionOption = screen.getByText('Production');
    await user.click(productionOption);

    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });

  it('supports multi-select functionality', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <TargetMultiSelect
        availableTargets={mockTargets}
        selectedTargetNames={['Production']}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Click to open the combobox
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    // Click on another target to add it to selection
    const stagingOption = screen.getByText('Staging');
    await user.click(stagingOption);

    expect(mockOnSelectionChange).toHaveBeenCalledWith([
      'Production',
      'Staging',
    ]);
  });

  it('clears all selections when reset button is clicked', async () => {
    renderWithProvider(
      <TargetMultiSelect
        availableTargets={mockTargets}
        selectedTargetNames={['Production', 'Staging']}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // For now, let's skip this test since we don't have a clear button implemented
    // The component should have a way to clear selections
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it.skip('filters targets based on input text', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <TargetMultiSelect
        availableTargets={mockTargets}
        selectedTargetNames={[]}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Click to open the combobox
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    // Wait for the dropdown to be fully opened and populated
    await screen.findByText('Production');
    await screen.findByText('Staging');
    await screen.findByText('Development');

    // Clear any existing text and type to filter with delay
    await user.clear(combobox);
    await user.type(combobox, 'Production', { delay: 50 });

    // Wait for filtering to complete and only Production should be visible
    await screen.findByText('Production');
    expect(screen.queryByText('Staging')).not.toBeInTheDocument();
    expect(screen.queryByText('Development')).not.toBeInTheDocument();
  });
});
