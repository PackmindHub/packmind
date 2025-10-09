import React from 'react';
import { PMVerticalNav, PMVerticalNavSection, PMLink } from '@packmind/ui';
import { NavLink } from 'react-router';
import { AuthContextOrganization } from '../../accounts/hooks/useAuthContext';
import { SidebarAccountMenu } from '../../accounts/components/SidebarAccountMenu';
import { SidebarOrgaSelector } from './OrgaSelector';

interface ISidebarNavigationProps {
  organization: AuthContextOrganization | undefined;
}

interface SidebarNavigationLinkProps {
  url: string;
  label: string;
  exact?: boolean;
}

export function SidebarNavigationLink({
  url,
  label,
  exact = false,
}: SidebarNavigationLinkProps): React.ReactElement {
  return (
    <NavLink to={url} end={exact}>
      {({ isActive }) => (
        <PMLink
          variant="navbar"
          data-active={isActive ? 'true' : undefined}
          as="span"
        >
          {label}
        </PMLink>
      )}
    </NavLink>
  );
}

export const SidebarNavigation: React.FunctionComponent<
  ISidebarNavigationProps
> = ({ organization }) => {
  if (!organization) {
    return;
  }
  return (
    <PMVerticalNav
      headerNav={<SidebarOrgaSelector currentOrganization={organization} />}
      footerNav={<SidebarAccountMenu />}
    >
      <PMVerticalNavSection
        navEntries={[
          <SidebarNavigationLink
            key="dashboard"
            url={organization ? `/org/${organization.slug}/` : '/'}
            label="Dashboard"
            exact
          />,
        ]}
      />
      <PMVerticalNavSection
        title="Knowledge base"
        navEntries={[
          <SidebarNavigationLink
            key="standards"
            url={
              organization
                ? `/org/${organization.slug}/standards`
                : '/standards'
            }
            label="Standards"
          />,
          <SidebarNavigationLink
            key="recipes"
            url={
              organization ? `/org/${organization.slug}/recipes` : '/recipes'
            }
            label="Recipes"
          />,
        ]}
      />
      <PMVerticalNavSection
        title="Deployments"
        navEntries={[
          <SidebarNavigationLink
            key="overview"
            url={
              organization
                ? `/org/${organization.slug}/deployments`
                : '/deployments'
            }
            label="Overview"
          />,
          <SidebarNavigationLink
            key="analytics"
            url={
              organization
                ? `/org/${organization.slug}/analytics`
                : '/analytics'
            }
            label="Analytics"
          />,
        ]}
      />
      {organization.role === 'admin' && (
        <PMVerticalNavSection
          navEntries={[
            <SidebarNavigationLink
              key="settings"
              url={
                organization
                  ? `/org/${organization.slug}/settings`
                  : '/settings'
              }
              label="Settings"
            />,
          ]}
        />
      )}
    </PMVerticalNav>
  );
};
