import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { PMCheckbox } from './PMCheckbox';
import { UIProvider } from '../../../UIProvider';

describe('PMCheckbox', () => {
  const renderWithProvider = (ui: React.ReactElement) =>
    render(<UIProvider>{ui}</UIProvider>);

  it('renders unchecked by default', () => {
    renderWithProvider(<PMCheckbox aria-label="checkbox" />);
    const checkbox = screen.getByLabelText('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('renders checked when checked prop is true', () => {
    renderWithProvider(<PMCheckbox checked readOnly aria-label="checkbox" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onChange when clicked (controlled)', () => {
    const handleChange = jest.fn();
    renderWithProvider(
      <PMCheckbox
        checked={false}
        onChange={handleChange}
        aria-label="checkbox"
      />,
    );
    const checkbox = screen.getByLabelText('checkbox');
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalled();
  });
});
