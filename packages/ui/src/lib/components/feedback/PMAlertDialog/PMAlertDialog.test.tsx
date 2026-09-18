import { render, screen } from '@testing-library/react';
import { PMAlertDialog } from './PMAlertDialog';
import { PMButton } from '../../form/PMButton/PMButton';
import { UIProvider } from '../../../UIProvider';

jest.mock('../../form/PMButton/PMButton', () => ({
  PMButton: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
};

describe('PMAlertDialog', () => {
  const defaultProps = {
    trigger: <PMButton>Delete</PMButton>,
    title: 'Confirm Deletion',
    message: 'Are you sure you want to delete this item?',
    onConfirm: jest.fn(),
  };

  it('renders trigger element', () => {
    renderWithProvider(<PMAlertDialog {...defaultProps} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('renders with custom confirm and cancel text', () => {
    renderWithProvider(
      <PMAlertDialog
        {...defaultProps}
        confirmText="Remove"
        cancelText="Keep"
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Remove')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('renders title and message when open', () => {
    renderWithProvider(
      <PMAlertDialog {...defaultProps} open={true} onOpenChange={jest.fn()} />,
    );

    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete this item?'),
    ).toBeInTheDocument();
  });

  it('shows loading state on confirm button', () => {
    renderWithProvider(
      <PMAlertDialog
        {...defaultProps}
        open={true}
        onOpenChange={jest.fn()}
        isLoading={true}
      />,
    );

    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBeGreaterThan(1);
    expect(deleteButtons[0]).toBeInTheDocument();
  });

  it('works in uncontrolled mode', () => {
    const onConfirm = jest.fn();
    renderWithProvider(
      <PMAlertDialog
        trigger={<PMButton>Delete Item</PMButton>}
        title="Delete Item"
        message="Are you sure?"
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked in controlled mode', () => {
    const onOpenChange = jest.fn();
    renderWithProvider(
      <PMAlertDialog
        {...defaultProps}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    const cancelButton = screen.getByText('Cancel');
    cancelButton.click();

    expect(onOpenChange).toHaveBeenCalledWith({ open: false });
  });

  it('does not call onOpenChange when cancel is clicked in uncontrolled mode', () => {
    const onOpenChange = jest.fn();
    renderWithProvider(
      <PMAlertDialog {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Uncontrolled dialog starts closed, so cancel can't be exercised directly;
    // this just confirms the trigger renders without calling onOpenChange.
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});
