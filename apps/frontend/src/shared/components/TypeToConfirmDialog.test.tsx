import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { TypeToConfirmDialog } from './TypeToConfirmDialog';

const renderWithProviders = (ui: React.ReactElement) =>
  render(<UIProvider>{ui}</UIProvider>);

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  title: 'Delete space',
  expectedValue: 'Test Space',
  inputPlaceholder: 'Enter space name',
  confirmLabel: 'Delete',
  isPending: false,
  onConfirm: jest.fn(),
};

describe('TypeToConfirmDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the dialog is open', () => {
    it('renders the title', async () => {
      renderWithProviders(<TypeToConfirmDialog {...defaultProps} />);

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveTextContent('Delete space');
    });

    it('renders the body children above the input', async () => {
      renderWithProviders(
        <TypeToConfirmDialog {...defaultProps}>
          <p>Custom description content</p>
        </TypeToConfirmDialog>,
      );

      expect(
        await screen.findByText('Custom description content'),
      ).toBeInTheDocument();
    });

    it('renders the input with the provided placeholder', async () => {
      renderWithProviders(<TypeToConfirmDialog {...defaultProps} />);

      expect(
        await screen.findByPlaceholderText('Enter space name'),
      ).toBeInTheDocument();
    });

    it('renders the confirm button as disabled by default', async () => {
      renderWithProviders(<TypeToConfirmDialog {...defaultProps} />);

      const confirmButton = await screen.findByRole('button', {
        name: 'Delete',
      });
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('when the user types a non-matching value', () => {
    it('keeps the confirm button disabled', async () => {
      renderWithProviders(<TypeToConfirmDialog {...defaultProps} />);

      const input = await screen.findByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Wrong Name' } });

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    });
  });

  describe('when the user types a value with different casing', () => {
    it('keeps the confirm button disabled (case sensitive)', async () => {
      renderWithProviders(<TypeToConfirmDialog {...defaultProps} />);

      const input = await screen.findByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'test space' } });

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    });
  });

  describe('when the user types the matching value', () => {
    it('enables the confirm button', async () => {
      renderWithProviders(<TypeToConfirmDialog {...defaultProps} />);

      const input = await screen.findByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Test Space' } });

      expect(screen.getByRole('button', { name: 'Delete' })).not.toBeDisabled();
    });

    describe('and clicks the confirm button', () => {
      it('calls onConfirm', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
          <TypeToConfirmDialog {...defaultProps} onConfirm={onConfirm} />,
        );

        const input = await screen.findByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Test Space' } });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    describe('and submits with the Enter key', () => {
      it('calls onConfirm', async () => {
        const onConfirm = jest.fn();
        renderWithProviders(
          <TypeToConfirmDialog {...defaultProps} onConfirm={onConfirm} />,
        );

        const input = await screen.findByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Test Space' } });
        const form = input.closest('form');
        if (!form) {
          throw new Error('Expected the input to be inside a form');
        }
        fireEvent.submit(form);

        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when the user submits with a non-matching value via Enter', () => {
    it('does not call onConfirm', async () => {
      const onConfirm = jest.fn();
      renderWithProviders(
        <TypeToConfirmDialog {...defaultProps} onConfirm={onConfirm} />,
      );

      const input = await screen.findByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Wrong Name' } });
      const form = input.closest('form');
      if (!form) {
        throw new Error('Expected the input to be inside a form');
      }
      fireEvent.submit(form);

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('when isPending is true', () => {
    it('disables the cancel button', async () => {
      renderWithProviders(<TypeToConfirmDialog {...defaultProps} isPending />);

      const cancelButton = await screen.findByRole('button', {
        name: 'Cancel',
      });
      expect(cancelButton).toBeDisabled();
    });

    it('disables the confirm button even when the value matches', async () => {
      renderWithProviders(<TypeToConfirmDialog {...defaultProps} isPending />);

      const input = await screen.findByPlaceholderText('Enter space name');
      fireEvent.change(input, { target: { value: 'Test Space' } });

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    });

    it('blocks onOpenChange from being called', async () => {
      const onOpenChange = jest.fn();
      renderWithProviders(
        <TypeToConfirmDialog
          {...defaultProps}
          isPending
          onOpenChange={onOpenChange}
        />,
      );

      const cancelButton = await screen.findByRole('button', {
        name: 'Cancel',
      });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });
});
