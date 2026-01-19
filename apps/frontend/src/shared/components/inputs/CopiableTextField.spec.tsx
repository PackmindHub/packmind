import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { CopiableTextField } from './CopiableTextField';

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

describe('CopiableTextField', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with the provided value', () => {
    renderWithUI(<CopiableTextField value="test value" />);

    const input = screen.getByDisplayValue('test value');
    expect(input).toBeInTheDocument();
  });

  it('renders with a label when provided', () => {
    renderWithUI(<CopiableTextField value="test value" label="Test Label" />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('calls onValueChange when input value changes and not readonly', () => {
    const mockOnValueChange = jest.fn();
    renderWithUI(
      <CopiableTextField value="" onValueChange={mockOnValueChange} />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(mockOnValueChange).toHaveBeenCalledWith('new value');
  });

  it('does not call onValueChange when readonly', () => {
    const mockOnValueChange = jest.fn();
    renderWithUI(
      <CopiableTextField
        value="test"
        onValueChange={mockOnValueChange}
        readOnly
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(mockOnValueChange).not.toHaveBeenCalled();
  });

  it('renders copy button with copy icon', () => {
    renderWithUI(<CopiableTextField value="test value" />);

    const copyButton = screen.getByLabelText('Copy to clipboard');
    expect(copyButton).toBeInTheDocument();
  });

  it('passes through additional input props', () => {
    renderWithUI(
      <CopiableTextField value="test" placeholder="Enter text" disabled />,
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter text');
    expect(input).toBeDisabled();
  });

  describe('onCopy', () => {
    describe('when copy button is clicked', () => {
      it('triggers onCopy callback', () => {
        const mockOnCopy = jest.fn();
        renderWithUI(<CopiableTextField value="test" onCopy={mockOnCopy} />);

        const copyButton = screen.getByLabelText('Copy to clipboard');
        fireEvent.click(copyButton);

        expect(mockOnCopy).toHaveBeenCalledTimes(1);
      });
    });

    describe('when text is copied from input', () => {
      it('triggers onCopy callback', () => {
        const mockOnCopy = jest.fn();
        renderWithUI(<CopiableTextField value="test" onCopy={mockOnCopy} />);

        const input = screen.getByRole('textbox');
        fireEvent.copy(input);

        expect(mockOnCopy).toHaveBeenCalledTimes(1);
      });
    });

    describe('when onCopy is not provided', () => {
      it('does not throw', () => {
        renderWithUI(<CopiableTextField value="test" />);

        const copyButton = screen.getByLabelText('Copy to clipboard');

        expect(() => fireEvent.click(copyButton)).not.toThrow();
      });
    });
  });
});
