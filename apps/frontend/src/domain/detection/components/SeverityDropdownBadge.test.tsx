import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DetectionSeverity } from '@packmind/types';
import { UIProvider } from '@packmind/ui';
import { SeverityDropdownBadge } from './SeverityDropdownBadge';

describe('SeverityDropdownBadge', () => {
  const defaultProps = {
    severity: DetectionSeverity.ERROR,
    onSeverityChange: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current severity text', () => {
    render(
      <UIProvider>
        <SeverityDropdownBadge {...defaultProps} />
      </UIProvider>,
    );

    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('renders warning text when severity is WARNING', () => {
    render(
      <UIProvider>
        <SeverityDropdownBadge
          {...defaultProps}
          severity={DetectionSeverity.WARNING}
        />
      </UIProvider>,
    );

    expect(screen.getByText('warning')).toBeInTheDocument();
  });

  describe('when clicking the badge and selecting a different severity', () => {
    it('calls onSeverityChange with the new severity', async () => {
      const onSeverityChange = jest.fn();
      const user = userEvent.setup();

      render(
        <UIProvider>
          <SeverityDropdownBadge
            {...defaultProps}
            onSeverityChange={onSeverityChange}
          />
        </UIProvider>,
      );

      await user.click(screen.getByText('error'));
      await user.click(screen.getByText('warning'));

      expect(onSeverityChange).toHaveBeenCalledWith(DetectionSeverity.WARNING);
    });
  });

  describe('when disabled', () => {
    it('does not open menu on click', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <SeverityDropdownBadge {...defaultProps} isDisabled={true} />
        </UIProvider>,
      );

      await user.click(screen.getByText('error'));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});
