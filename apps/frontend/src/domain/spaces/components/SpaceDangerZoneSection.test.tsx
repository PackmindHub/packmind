import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { SpaceType } from '@packmind/types';

import * as UseCurrentSpaceModule from '../hooks/useCurrentSpace';
import { SpaceDangerZoneSection } from './SpaceDangerZoneSection';

jest.mock('../hooks/useCurrentSpace', () => ({
  ...jest.requireActual('../hooks/useCurrentSpace'),
  useCurrentSpace: jest.fn(),
}));

const mockUseCurrentSpace = (
  overrides: Partial<ReturnType<typeof UseCurrentSpaceModule.useCurrentSpace>>,
) => {
  jest.spyOn(UseCurrentSpaceModule, 'useCurrentSpace').mockReturnValue({
    spaceId: 'space-1',
    spaceSlug: 'test-space',
    spaceName: 'Test Space',
    space: {
      id: 'space-1',
      name: 'Test Space',
      slug: 'test-space',
      type: SpaceType.open,
      organizationId: 'org-1',
      isDefaultSpace: false,
    },
    isLoading: false,
    error: null,
    isReady: true,
    ...overrides,
  } as unknown as ReturnType<typeof UseCurrentSpaceModule.useCurrentSpace>);
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

describe('SpaceDangerZoneSection', () => {
  afterEach(() => jest.clearAllMocks());

  beforeEach(() => {
    mockUseCurrentSpace({});
  });

  describe('when the leave dialog is opened', () => {
    const openLeaveDialog = () => {
      renderWithProviders(<SpaceDangerZoneSection />);
      const trigger = screen.getByRole('button', {
        name: /leave this space/i,
      });
      fireEvent.click(trigger);
    };

    beforeEach(() => {
      openLeaveDialog();
    });

    it('renders the confirmation input prompt', () => {
      expect(
        screen.getByPlaceholderText('Enter space name'),
      ).toBeInTheDocument();
    });

    it('renders the leave button as disabled', () => {
      const leaveButton = screen.getByRole('button', { name: 'Leave' });

      expect(leaveButton).toBeDisabled();
    });

    describe('when the user types a wrong space name', () => {
      it('keeps the leave button disabled', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Wrong Name' } });

        const leaveButton = screen.getByRole('button', { name: 'Leave' });

        expect(leaveButton).toBeDisabled();
      });
    });

    describe('when the user types the correct space name', () => {
      it('enables the leave button', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'Test Space' } });

        const leaveButton = screen.getByRole('button', { name: 'Leave' });

        expect(leaveButton).not.toBeDisabled();
      });
    });

    describe('when the user types the space name with different casing', () => {
      it('keeps the leave button disabled', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'test space' } });

        const leaveButton = screen.getByRole('button', { name: 'Leave' });

        expect(leaveButton).toBeDisabled();
      });
    });
  });

  describe('when the delete dialog is opened', () => {
    const openDeleteDialog = () => {
      renderWithProviders(<SpaceDangerZoneSection />);
      const trigger = screen.getByRole('button', {
        name: /delete this space/i,
      });
      fireEvent.click(trigger);
    };

    beforeEach(() => {
      openDeleteDialog();
    });

    it('renders the confirmation input prompt', () => {
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
        fireEvent.change(input, { target: { value: 'Test Space' } });

        const deleteButton = screen.getByRole('button', { name: 'Delete' });

        expect(deleteButton).not.toBeDisabled();
      });
    });

    describe('when the user types the space name with different casing', () => {
      it('keeps the delete button disabled', () => {
        const input = screen.getByPlaceholderText('Enter space name');
        fireEvent.change(input, { target: { value: 'test space' } });

        const deleteButton = screen.getByRole('button', { name: 'Delete' });

        expect(deleteButton).toBeDisabled();
      });
    });
  });
});
