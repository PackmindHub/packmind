import React from 'react';
import { PMVerticalNav, PMVerticalNavSection, PMLink } from '@packmind/ui';
import { NavLink } from 'react-router';
import { AuthContextOrganization } from '../../accounts/hooks/useAuthContext';
import { SidebarAccountMenu } from '../../accounts/components/SidebarAccountMenu';

interface ISidebarNavigationProps {
  organization: AuthContextOrganization | undefined;
}

interface SidebarNavigationLinkProps {
  url: string;
  label: string;
}

function SidebarNavigationLink({
  url,
  label,
}: SidebarNavigationLinkProps): React.ReactElement {
  return (
    <NavLink to={url}>
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
  return (
    <PMVerticalNav footerNav={<SidebarAccountMenu />}>
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
            key="targets"
            url={
              organization ? `/org/${organization.slug}/targets` : '/targets'
            }
            label="Targets"
          />,
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
      <PMVerticalNavSection
        navEntries={[
          <SidebarNavigationLink
            key="settings"
            url={
              organization ? `/org/${organization.slug}/settings` : '/settings'
            }
            label="Settings"
          />,
        ]}
      />
    </PMVerticalNav>
  );
};
