import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';

import { SpaceDangerZoneSection } from './SpaceDangerZoneSection';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

const openDeleteDialog = () => {
  const trigger = screen.getByRole('button', { name: /delete this space/i });
  fireEvent.click(trigger);
};

describe('SpaceDangerZoneSection', () => {
  describe('when the delete dialog is opened', () => {
    beforeEach(() => {
      renderWithProviders(<SpaceDangerZoneSection />);
      openDeleteDialog();
    });

    it('displays the confirmation input prompt', () => {
      expect(
        screen.getByPlaceholderText('Enter space name'),
      ).toBeInTheDocument();
    });

    it('renders the delete button as disabled', () => {
      const deleteButton = screen.getByRole('button', { name: 'Delete' });

      expect(deleteButton).toBeDisabled();
    });

    describe('when the user types a wrong space name', () => {
      it('keeps the delete button disabled', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Wrong Name' } });

        const deleteButton = screen.getByRole('button', { name: 'Delete' });

        expect(deleteButton).toBeDisabled();
      });
    });

    describe('when the user types the correct space name', () => {
      it('enables the delete button', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'My Space' } });

        const deleteButton = screen.getByRole('button', { name: 'Delete' });

        expect(deleteButton).not.toBeDisabled();
      });
    });

    describe('when the user types the space name with different casing', () => {
      it('keeps the delete button disabled', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'my space' } });

        const deleteButton = screen.getByRole('button', { name: 'Delete' });

        expect(deleteButton).toBeDisabled();
      });
    });
  });
});
