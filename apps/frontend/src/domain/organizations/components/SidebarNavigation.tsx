import React from 'react';
import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMLink,
  PMIcon,
  PMSeparator,
  PMFeatureFlag,
  PACKAGES_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
} from '@packmind/ui';
import { NavLink, useParams } from 'react-router';
import {
  AuthContextOrganization,
  useAuthContext,
} from '../../accounts/hooks/useAuthContext';
import { SidebarAccountMenu } from '../../accounts/components/SidebarAccountMenu';
import { SidebarOrgaSelector } from './OrgaSelector';
import { SidebarHelpMenu } from './SidebarHelpMenu';
import { LuHouse, LuSettings } from 'react-icons/lu';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { routes } from '../../../shared/utils/routes';

interface ISidebarNavigationProps {
  organization: AuthContextOrganization | undefined;
}

interface SidebarNavigationLinkProps {
  url: string;
  label: string;
  exact?: boolean;
  icon?: React.ReactNode;
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
  const { user } = useAuthContext();

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
        title="Knowledge base"
        navEntries={[
          <SidebarNavigationLink
            key="learnings"
            url={routes.space.toLearnings(orgSlug, currentSpaceSlug)}
            label="Learnings"
          />,
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
          <PMFeatureFlag
            key="packages"
            featureKeys={[PACKAGES_FEATURE_KEY]}
            featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
            userEmail={user?.email}
          >
            <SidebarNavigationLink
              url={routes.space.toPackages(orgSlug, currentSpaceSlug)}
              label="Packages"
            />
          </PMFeatureFlag>,
          <SidebarNavigationLink
            key="overview"
            url={routes.org.toDeployments(orgSlug)}
            label="Overview"
          />,
          <SidebarNavigationLink
            key="analytics"
            url={routes.org.toAnalytics(orgSlug)}
            label="Analytics"
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
            />,
          );
        }
        lastEntries.push(<SidebarHelpMenu key="help" />);
        return <PMVerticalNavSection navEntries={lastEntries} />;
      })()}
    </PMVerticalNav>
  );
};
