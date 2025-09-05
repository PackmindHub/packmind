import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { CopiableTextarea } from './CopiableTextarea';

// Mock the clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

const renderWithUI = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

describe('CopiableTextarea', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with the provided value', () => {
    renderWithUI(<CopiableTextarea value="test value" />);

    const textarea = screen.getByDisplayValue('test value');
    expect(textarea).toBeInTheDocument();
  });

  it('calls onValueChange when textarea value changes and not readonly', () => {
    const mockOnValueChange = jest.fn();
    renderWithUI(
      <CopiableTextarea value="" onValueChange={mockOnValueChange} />,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new value' } });

    expect(mockOnValueChange).toHaveBeenCalledWith('new value');
  });

  it('does not call onValueChange when readonly', () => {
    const mockOnValueChange = jest.fn();
    renderWithUI(
      <CopiableTextarea
        value="test"
        onValueChange={mockOnValueChange}
        readOnly
      />,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new value' } });

    expect(mockOnValueChange).not.toHaveBeenCalled();
  });

  it('renders copy button with copy icon', () => {
    renderWithUI(<CopiableTextarea value="test value" />);

    const copyButton = screen.getByLabelText('Copy to clipboard');
    expect(copyButton).toBeInTheDocument();
  });

  it('passes through additional textarea props', () => {
    renderWithUI(
      <CopiableTextarea value="test" placeholder="Enter text" disabled />,
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', 'Enter text');
    expect(textarea).toBeDisabled();
  });
});
