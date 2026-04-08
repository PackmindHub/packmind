// apps/frontend/src/domain/spaces-management/components/BrowseSpacesDrawer.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import {
  SpaceType,
  createSpaceId,
  createOrganizationId,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { BrowseSpacesDrawer } from './BrowseSpacesDrawer';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
};

describe('BrowseSpacesDrawer', () => {
  const organizationId = createOrganizationId('org-1');
  const mySpaces = [
    spaceFactory({
      id: createSpaceId('space-1'),
      name: 'My Team',
      slug: 'my-team',
      type: SpaceType.open,
      organizationId,
    }),
    spaceFactory({
      id: createSpaceId('space-2'),
      name: 'Default',
      slug: 'default',
      type: SpaceType.open,
      organizationId,
      isDefaultSpace: true,
    }),
  ];

  const allSpaces = [
    { id: createSpaceId('space-3'), name: 'Open Space', type: SpaceType.open },
    {
      id: createSpaceId('space-4'),
      name: 'Restricted Space',
      type: SpaceType.restricted,
    },
  ];

  const defaultProps = {
    mySpaces,
    allSpaces,
    open: true,
    onClose: jest.fn(),
    onSpaceClick: jest.fn(),
    onJoinSpace: jest.fn(),
    onCreateSpace: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the drawer is open on My spaces tab', () => {
    it('renders My Team space', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      expect(screen.getByText('My Team')).toBeInTheDocument();
    });

    it('renders Default space', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('navigates to space on click', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-my-space-1'));

      expect(defaultProps.onSpaceClick).toHaveBeenCalledWith(mySpaces[0]);
    });
  });

  describe('when switching to All spaces tab', () => {
    describe('when rendering open type space', () => {
      beforeEach(() => {
        renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);
        fireEvent.click(screen.getByTestId('browse-spaces-tab-all-spaces'));
      });

      it('renders Open Space name', () => {
        expect(screen.getByText('Open Space')).toBeInTheDocument();
      });

      it('renders join button for open space', () => {
        expect(
          screen.getByTestId('browse-spaces-join-space-3'),
        ).toBeInTheDocument();
      });
    });

    describe('when rendering restricted type space', () => {
      beforeEach(() => {
        renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);
        fireEvent.click(screen.getByTestId('browse-spaces-tab-all-spaces'));
      });

      it('renders join button for restricted space', () => {
        expect(
          screen.getByTestId('browse-spaces-join-space-4'),
        ).toBeInTheDocument();
      });
    });

    it('calls onJoinSpace when clicking join', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-tab-all-spaces'));
      fireEvent.click(screen.getByTestId('browse-spaces-join-space-3'));

      expect(defaultProps.onJoinSpace).toHaveBeenCalledWith(
        createSpaceId('space-3'),
      );
    });
  });

  describe('when searching', () => {
    describe('when filtering my spaces by name', () => {
      beforeEach(() => {
        renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);
        const searchInput = screen.getByTestId('browse-spaces-search');
        fireEvent.change(searchInput, { target: { value: 'Team' } });
      });

      it('shows matching space', () => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      it('hides non-matching space', () => {
        expect(screen.queryByText('Default')).not.toBeInTheDocument();
      });
    });

    it('shows empty state when no match', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      const searchInput = screen.getByTestId('browse-spaces-search');
      fireEvent.change(searchInput, { target: { value: 'zzzzz' } });

      expect(screen.getByText(/No spaces matching/)).toBeInTheDocument();
    });
  });

  describe('when clicking New button', () => {
    it('calls onCreateSpace', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-new-button'));

      expect(defaultProps.onCreateSpace).toHaveBeenCalled();
    });
  });
});
