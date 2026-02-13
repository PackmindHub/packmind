import React from 'react';
import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMLink,
  PMIcon,
  PMSeparator,
  PMBadge,
  PMTooltip,
} from '@packmind/ui';
import { NavLink, useParams } from 'react-router';
import { AuthContextOrganization } from '../../accounts/hooks/useAuthContext';
import { SidebarAccountMenu } from '../../accounts/components/SidebarAccountMenu';
import { SidebarOrgaSelector } from './OrgaSelector';
import { SidebarHelpMenu } from './SidebarHelpMenu';
import { LuHouse, LuSettings, LuWrench } from 'react-icons/lu';
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
  badge?: {
    text: string;
    colorScheme?: string;
  };
  'data-testid'?: string;
}

export function SidebarNavigationLink(
  props: Readonly<SidebarNavigationLinkProps>,
): React.ReactElement {
  const { url, label, exact = false, icon, badge } = props;
  return (
    <NavLink to={url} end={exact} prefetch="intent">
      {({ isActive }) => (
        <PMLink
          variant="navbar"
          data-active={isActive ? 'true' : undefined}
          as="span"
          data-testid={props['data-testid']}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {icon && <PMIcon mr={2}>{icon}</PMIcon>}
            {label}
          </span>
          {badge && (
            <PMTooltip label="Coming soon to the Enterprise plan">
              <PMBadge
                size="sm"
                colorScheme={badge.colorScheme || 'purple'}
                ml={2}
                fontSize="xs"
              >
                {badge.text}
              </PMBadge>
            </PMTooltip>
          )}
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
            url={routes.space.toCommands(orgSlug, currentSpaceSlug)}
            label="Commands"
          />,
          <SidebarNavigationLink
            key="skills"
            url={routes.space.toSkills(orgSlug, currentSpaceSlug)}
            label="Skills"
            data-testid={SidebarNavigationDataTestId.SkillsLink}
          />,
        ]}
      />
      <PMVerticalNavSection
        title="Distribution"
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
            badge={{ text: 'Enterprise', colorScheme: 'purple' }}
          />,
        ]}
      />
      <PMSeparator borderColor={'border.tertiary'} />
      {(() => {
        const lastEntries: React.ReactElement[] = [];

        // Setup is available to all users
        lastEntries.push(
          <SidebarNavigationLink
            key="setup"
            url={routes.org.toSetup(orgSlug)}
            label="Integrations"
            icon={<LuWrench />}
          />,
        );

        // Settings is only available to admins
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
