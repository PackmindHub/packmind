import React from 'react';
import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMLink,
  PMIcon,
  PMSeparator,
} from '@packmind/ui';
import { NavLink, useParams } from 'react-router';
import { AuthContextOrganization } from '../../accounts/hooks/useAuthContext';
import { SidebarAccountMenu } from '../../accounts/components/SidebarAccountMenu';
import { SidebarOrgaSelector } from './OrgaSelector';
import { SidebarHelpMenu } from './SidebarHelpMenu';
import { LuHouse, LuSettings } from 'react-icons/lu';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { routes } from '../../../shared/utils/routes';
import { SidebarNavigationDataTestId } from '@packmind/frontend';

interface ISidebarNavigationProps {
  organization: AuthContextOrganization | undefined;
}

interface SidebarNavigationLinkProps {
  url: string;
  label: string;
  exact?: boolean;
  icon?: React.ReactNode;
  'data-testid'?: string;
}

export function SidebarNavigationLink(
  props: Readonly<SidebarNavigationLinkProps>,
): React.ReactElement {
  const { url, label, exact = false, icon } = props;
  return (
    <NavLink to={url} end={exact}>
      {({ isActive }) => (
        <PMLink
          variant="navbar"
          data-active={isActive ? 'true' : undefined}
          as="span"
          data-testid={props['data-testid']}
        >
          {icon && <PMIcon mr={2}>{icon}</PMIcon>}
          {label}
        </PMLink>
      )}
    </NavLink>
  );
}

export const SidebarNavigation: React.FunctionComponent<
  Readonly<ISidebarNavigationProps>
> = ({ organization }) => {
  const { spaceSlug } = useParams<{ spaceSlug?: string }>();
  const { data: spaces } = useGetSpacesQuery();

  // Use spaceSlug from URL if available, otherwise use first space from query
  const currentSpaceSlug =
    spaceSlug || (spaces && spaces.length > 0 ? spaces[0].slug : undefined);

  if (!organization) {
    return;
  }

  const orgSlug = organization.slug;

  // Don't render space-scoped links if we don't have a space slug yet
  if (!currentSpaceSlug) {
    return (
      <PMVerticalNav
        headerNav={<SidebarOrgaSelector currentOrganization={organization} />}
        footerNav={<SidebarAccountMenu />}
      >
        <PMVerticalNavSection navEntries={[]} />
      </PMVerticalNav>
    );
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
            url={routes.org.toDashboard(orgSlug)}
            label="Dashboard"
            exact
            icon={<LuHouse />}
          />,
        ]}
      />
      <PMVerticalNavSection
        title="Playbook"
        navEntries={[
          <SidebarNavigationLink
            key="standards"
            url={routes.space.toStandards(orgSlug, currentSpaceSlug)}
            label="Standards"
          />,
          <SidebarNavigationLink
            key="recipes"
            url={routes.space.toRecipes(orgSlug, currentSpaceSlug)}
            label="Recipes"
          />,
        ]}
      />
      <PMVerticalNavSection
        title="Deployments"
        navEntries={[
          <SidebarNavigationLink
            key="packages"
            url={routes.space.toPackages(orgSlug, currentSpaceSlug)}
            label="Packages"
            data-testid={SidebarNavigationDataTestId.PackagesLink}
          />,
          <SidebarNavigationLink
            key="overview"
            url={routes.org.toDeployments(orgSlug)}
            label="Overview"
          />,
        ]}
      />
      <PMSeparator borderColor={'border.tertiary'} />
      {(() => {
        const lastEntries: React.ReactElement[] = [];
        if (organization.role === 'admin') {
          lastEntries.push(
            <SidebarNavigationLink
              key="settings"
              url={routes.org.toSettings(orgSlug)}
              label="Settings"
              icon={<LuSettings />}
              data-testid={SidebarNavigationDataTestId.SettingsLink}
            />,
          );
        }
        lastEntries.push(<SidebarHelpMenu key="help" />);
        return <PMVerticalNavSection navEntries={lastEntries} />;
      })()}
    </PMVerticalNav>
  );
};
