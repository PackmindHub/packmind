import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { CopiableTextarea } from './CopiableTextarea';

// jsdom's `navigator` is shared by every spec in the worker, so the clipboard
// stub is defined rather than assigned — `Object.assign` goes through jsdom's
// getter-only `clipboard` accessor and throws once a sibling spec has installed
// its own — and put back afterwards rather than left on the global.
const mockWriteText = vi.fn();
const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  configurable: true,
});

afterAll(() => {
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard);
  } else {
    // Nothing owned it before: dropping the own property re-exposes jsdom's
    // prototype accessor.
    delete (navigator as unknown as { clipboard?: unknown }).clipboard;
  }
});

const renderWithUI = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

describe('CopiableTextarea', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with the provided value', () => {
    renderWithUI(<CopiableTextarea value="test value" />);

    const textarea = screen.getByDisplayValue('test value');
    expect(textarea).toBeInTheDocument();
  });

  it('calls onValueChange when textarea value changes and not readonly', () => {
    const mockOnValueChange = vi.fn();
    renderWithUI(
      <CopiableTextarea value="" onValueChange={mockOnValueChange} />,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new value' } });

    expect(mockOnValueChange).toHaveBeenCalledWith('new value');
  });

  it('does not call onValueChange when readonly', () => {
    const mockOnValueChange = vi.fn();
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

  describe('onCopy', () => {
    describe('when copy button is clicked', () => {
      it('triggers onCopy callback', () => {
        const mockOnCopy = vi.fn();
        renderWithUI(<CopiableTextarea value="test" onCopy={mockOnCopy} />);

        const copyButton = screen.getByLabelText('Copy to clipboard');
        fireEvent.click(copyButton);

        expect(mockOnCopy).toHaveBeenCalledTimes(1);
      });
    });

    describe('when text is copied from textarea', () => {
      it('triggers onCopy callback', () => {
        const mockOnCopy = vi.fn();
        renderWithUI(<CopiableTextarea value="test" onCopy={mockOnCopy} />);

        const textarea = screen.getByRole('textbox');
        fireEvent.copy(textarea);

        expect(mockOnCopy).toHaveBeenCalledTimes(1);
      });
    });

    describe('when onCopy is not provided', () => {
      it('does not throw', () => {
        renderWithUI(<CopiableTextarea value="test" />);

        const copyButton = screen.getByLabelText('Copy to clipboard');

        expect(() => fireEvent.click(copyButton)).not.toThrow();
      });
    });
  });
});
