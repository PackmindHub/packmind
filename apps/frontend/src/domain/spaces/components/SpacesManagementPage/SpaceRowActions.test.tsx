import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createSpaceId,
  SpaceType,
} from '@packmind/types';

import { SpaceRowActions } from './SpaceRowActions';

const mockNavigate = jest.fn();

jest.mock('react-router', () => {
  const actual = jest.requireActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock(
  '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
  () => ({
    ...jest.requireActual(
      '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
    ),
    useDeleteSpaceMutation: jest.fn(() => ({
      mutate: jest.fn(),
      isPending: false,
    })),
    useJoinSpaceMutation: jest.fn(() => ({
      mutate: jest.fn(),
      isPending: false,
    })),
  }),
);

jest.mock('../../../accounts/hooks/useAuthContext', () => ({
  ...jest.requireActual('../../../accounts/hooks/useAuthContext'),
  useAuthContext: () => ({
    organization: { id: 'org-1', slug: 'test-org' },
  }),
}));

const buildSpace = (
  overrides: Partial<{
    id: string;
    name: string;
    slug: string;
    isDefaultSpace: boolean;
  }> = {},
) => ({
  id: createSpaceId('00000000-0000-0000-0000-000000000001'),
  name: 'Engineering',
  slug: 'engineering',
  type: SpaceType.open,
  organizationId: createOrganizationId('11111111-1111-1111-1111-111111111111'),
  isDefaultSpace: false,
  ...overrides,
});

const renderWithProviders = (
  ui: React.ReactElement,
  { route = '/org/test-org/settings/spaces' }: { route?: string } = {},
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <UIProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/org/:orgSlug/settings/spaces" element={ui} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </UIProvider>,
  );
};

const openMenu = async () => {
  const trigger = await screen.findByRole('button', { name: /actions/i });
  await act(async () => {
    fireEvent.click(trigger);
  });
};

describe('SpaceRowActions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Edit menu item', () => {
    it('renders the Edit item in the menu when onEdit is provided', async () => {
      const onEdit = jest.fn();
      renderWithProviders(
        <SpaceRowActions
          space={buildSpace()}
          isMember={false}
          onEdit={onEdit}
        />,
      );
      await openMenu();
      expect(
        screen.getByRole('menuitem', { name: /edit/i }),
      ).toBeInTheDocument();
    });

    it('calls onEdit when the Edit menu item is clicked', async () => {
      const onEdit = jest.fn();
      renderWithProviders(
        <SpaceRowActions
          space={buildSpace()}
          isMember={false}
          onEdit={onEdit}
        />,
      );
      await openMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
      });
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('does not render the Edit item when onEdit is not provided', async () => {
      renderWithProviders(
        <SpaceRowActions space={buildSpace()} isMember={false} />,
      );
      await openMenu();
      expect(
        screen.queryByRole('menuitem', { name: /edit/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the space is the default org-wide space', () => {
    it('does not render the Delete action', async () => {
      renderWithProviders(
        <SpaceRowActions
          space={buildSpace({ isDefaultSpace: true })}
          isMember={true}
        />,
      );

      await openMenu();

      expect(
        screen.queryByRole('menuitem', { name: /delete/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the space is not the default space', () => {
    it('renders the Delete action and opens the confirmation dialog when clicked', async () => {
      renderWithProviders(
        <SpaceRowActions
          space={buildSpace({ isDefaultSpace: false })}
          isMember={false}
        />,
      );

      await openMenu();

      const deleteItem = await screen.findByRole('menuitem', {
        name: /delete/i,
      });
      await act(async () => {
        fireEvent.click(deleteItem);
      });

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveTextContent(/Delete space/i);
      expect(dialog).toHaveTextContent(/Engineering/);
    });
  });

  describe('View vs Join based on membership', () => {
    it('renders View when the user is a member and has a slug', async () => {
      renderWithProviders(
        <SpaceRowActions space={buildSpace()} isMember={true} />,
      );

      await openMenu();

      expect(
        screen.getByRole('menuitem', { name: /view/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: /join/i }),
      ).not.toBeInTheDocument();
    });

    it('renders Join when the user is not a member', async () => {
      renderWithProviders(
        <SpaceRowActions space={buildSpace()} isMember={false} />,
      );

      await openMenu();

      expect(
        screen.getByRole('menuitem', { name: /join/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: /view/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render View when the slug is missing even if member', async () => {
      renderWithProviders(
        <SpaceRowActions space={buildSpace({ slug: '' })} isMember={true} />,
      );

      await openMenu();

      expect(
        screen.queryByRole('menuitem', { name: /view/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the user clicks View', () => {
    it('navigates to the space dashboard route', async () => {
      renderWithProviders(
        <SpaceRowActions space={buildSpace()} isMember={true} />,
      );

      await openMenu();

      const viewItem = await screen.findByRole('menuitem', { name: /view/i });
      await act(async () => {
        fireEvent.click(viewItem);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/org/test-org/space/engineering',
      );
    });
  });
});
