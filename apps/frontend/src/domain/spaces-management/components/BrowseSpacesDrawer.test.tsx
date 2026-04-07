// apps/frontend/src/domain/spaces-management/components/BrowseSpacesDrawer.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { SpaceType } from '@packmind/types';
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
  const mySpaces = [
    {
      id: 'space-1',
      name: 'My Team',
      slug: 'my-team',
      type: SpaceType.open,
      organizationId: 'org-1',
      isDefaultSpace: false,
    },
    {
      id: 'space-2',
      name: 'Default',
      slug: 'default',
      type: SpaceType.open,
      organizationId: 'org-1',
      isDefaultSpace: true,
    },
  ];

  const allSpaces = [
    { id: 'space-3', name: 'Open Space', type: SpaceType.open },
    { id: 'space-4', name: 'Restricted Space', type: SpaceType.restricted },
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
    it('renders user spaces', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      expect(screen.getByText('My Team')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('navigates to space on click', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-my-space-1'));

      expect(defaultProps.onSpaceClick).toHaveBeenCalledWith(mySpaces[0]);
    });
  });

  describe('when switching to All spaces tab', () => {
    it('renders discoverable spaces with join button for open type', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-tab-all-spaces'));

      expect(screen.getByText('Open Space')).toBeInTheDocument();
      expect(
        screen.getByTestId('browse-spaces-join-space-3'),
      ).toBeInTheDocument();
    });

    it('does not render join button for restricted spaces', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-tab-all-spaces'));

      expect(screen.getByText('Restricted Space')).toBeInTheDocument();
      expect(
        screen.queryByTestId('browse-spaces-join-space-4'),
      ).not.toBeInTheDocument();
    });

    it('calls onJoinSpace when clicking join', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-tab-all-spaces'));
      fireEvent.click(screen.getByTestId('browse-spaces-join-space-3'));

      expect(defaultProps.onJoinSpace).toHaveBeenCalledWith('space-3');
    });
  });

  describe('when searching', () => {
    it('filters my spaces by name', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      const searchInput = screen.getByTestId('browse-spaces-search');
      fireEvent.change(searchInput, { target: { value: 'Team' } });

      expect(screen.getByText('My Team')).toBeInTheDocument();
      expect(screen.queryByText('Default')).not.toBeInTheDocument();
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
