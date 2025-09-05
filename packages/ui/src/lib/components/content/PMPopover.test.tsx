import { render, screen } from '@testing-library/react';
import { PMPopover } from './PMPopover';
import { PMButton } from '../form/PMButton/PMButton';
import { Box, Text } from '@chakra-ui/react';
import { UIProvider } from '../../UIProvider';

// Mock PMButton to avoid dependency issues
jest.mock('../form/PMButton/PMButton', () => ({
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

describe('PMPopover', () => {
  const defaultContent = (
    <Box p={4}>
      <Text>Popover content</Text>
    </Box>
  );

  const defaultTrigger = <PMButton>Trigger</PMButton>;

  it('renders trigger button', () => {
    renderWithProvider(
      <PMPopover content={defaultContent}>{defaultTrigger}</PMPopover>,
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('renders without crashing with minimal props', () => {
    renderWithProvider(
      <PMPopover content={<div>Content</div>}>
        <PMButton>Click me</PMButton>
      </PMPopover>,
    );

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders with different placements', () => {
    const placements = [
      'top',
      'bottom',
      'left',
      'right',
      'bottom-start',
      'bottom-end',
    ] as const;

    placements.forEach((placement) => {
      renderWithProvider(
        <PMPopover content={defaultContent} placement={placement}>
          <button>Trigger {placement}</button>
        </PMPopover>,
      );

      expect(screen.getByText(`Trigger ${placement}`)).toBeInTheDocument();
    });
  });

  it('renders with arrow', () => {
    renderWithProvider(
      <PMPopover content={defaultContent} showArrow>
        {defaultTrigger}
      </PMPopover>,
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('renders only trigger when disabled', () => {
    renderWithProvider(
      <PMPopover content={defaultContent} disabled>
        {defaultTrigger}
      </PMPopover>,
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('renders with rich content', () => {
    const richContent = (
      <Box p={4}>
        <Text fontWeight="bold">Repository Options</Text>
        <button>Deploy</button>
      </Box>
    );

    renderWithProvider(
      <PMPopover content={richContent}>{defaultTrigger}</PMPopover>,
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });
});
