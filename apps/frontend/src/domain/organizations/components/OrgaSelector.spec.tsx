import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { createOrganizationId, Organization } from '@packmind/types';
import { SidebarOrgaSelector } from './OrgaSelector';
import { useGetUserOrganizationsQuery } from '../../accounts/api/queries/AccountsQueries';
import { useGetOrganizationCreationPolicyQuery } from '../../accounts/api/queries/AuthQueries';
import {
  createPendingQueryResult,
  createSuccessQueryResult,
} from '../../../test/queryResultMocks';

vi.mock('../../accounts/api/queries/AccountsQueries', () => ({
  useGetUserOrganizationsQuery: vi.fn(),
  useCreateOrganizationMutation: vi.fn(() => ({ isPending: false })),
}));

vi.mock('../../accounts/api/queries/AuthQueries', () => ({
  useSelectOrganizationMutation: vi.fn(() => ({ isPending: false })),
  useGetOrganizationCreationPolicyQuery: vi.fn(),
}));

const currentOrganization = {
  id: createOrganizationId('org-1'),
  name: 'Current Org',
  slug: 'current-org',
  role: 'admin' as const,
};

const renderSelector = () =>
  render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={new QueryClient()}>
          <SidebarOrgaSelector
            currentOrganization={currentOrganization}
            hasOrgaSettings={false}
          />
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );

const openMenu = () =>
  userEvent.click(screen.getByRole('button', { name: /current org/i }));

describe('SidebarOrgaSelector', () => {
  beforeEach(() => {
    vi.mocked(useGetUserOrganizationsQuery).mockReturnValue(
      createSuccessQueryResult<Organization[]>([]),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when the user may create an organization', () => {
    it('offers to create a new organization', async () => {
      vi.mocked(useGetOrganizationCreationPolicyQuery).mockReturnValue(
        createSuccessQueryResult({ canCreateOrganization: true }),
      );
      renderSelector();

      await openMenu();

      expect(
        await screen.findByRole('menuitem', { name: /new organization/i }),
      ).toBeInTheDocument();
    });
  });

  describe('when organization creation is restricted', () => {
    it('hides the new organization item', async () => {
      vi.mocked(useGetOrganizationCreationPolicyQuery).mockReturnValue(
        createSuccessQueryResult({ canCreateOrganization: false }),
      );
      renderSelector();

      await openMenu();

      expect(
        screen.queryByRole('menuitem', { name: /new organization/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('while the creation policy is loading', () => {
    it('hides the new organization item', async () => {
      vi.mocked(useGetOrganizationCreationPolicyQuery).mockReturnValue(
        createPendingQueryResult(),
      );
      renderSelector();

      await openMenu();

      expect(
        screen.queryByRole('menuitem', { name: /new organization/i }),
      ).not.toBeInTheDocument();
    });
  });
});
