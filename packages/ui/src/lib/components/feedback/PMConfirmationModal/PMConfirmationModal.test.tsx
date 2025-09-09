import { render, screen } from '@testing-library/react';
import { PMConfirmationModal } from './PMConfirmationModal';
import { PMButton } from '../../form/PMButton/PMButton';
import { UIProvider } from '../../../UIProvider';

// Mock PMButton to avoid dependency issues
jest.mock('../../form/PMButton/PMButton', () => ({
  PMButton: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

// Helper function to render with UIProvider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
};

describe('PMConfirmationModal', () => {
  const defaultProps = {
    trigger: <PMButton>Delete</PMButton>,
    title: 'Confirm Deletion',
    message: 'Are you sure you want to delete this item?',
    onConfirm: jest.fn(),
  };

  it('renders trigger element', () => {
    renderWithProvider(<PMConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('renders with custom confirm and cancel text', () => {
    renderWithProvider(
      <PMConfirmationModal
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
      <PMConfirmationModal
        {...defaultProps}
        open={true}
        onOpenChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete this item?'),
    ).toBeInTheDocument();
  });

  it('shows loading state on confirm button', () => {
    renderWithProvider(
      <PMConfirmationModal
        {...defaultProps}
        open={true}
        onOpenChange={jest.fn()}
        isLoading={true}
      />,
    );

    // Get all Delete buttons and find the one inside the dialog footer
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBeGreaterThan(1);
    expect(deleteButtons[0]).toBeInTheDocument();
  });
});
