import React from 'react';
import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMLink,
  PMIcon,
  PMIconButton,
  PMSeparator,
  PMBadge,
  PMTooltip,
} from '@packmind/ui';
import { NavLink, useParams } from 'react-router';
import {
  AuthContextOrganization,
  useAuthContext,
} from '../../accounts/hooks/useAuthContext';
import { SidebarAccountMenu } from '../../accounts/components/SidebarAccountMenu';
import { SidebarOrgaSelector } from './OrgaSelector';
import { SidebarHelpMenu } from './SidebarHelpMenu';
import {
  LuBookCheck,
  LuEye,
  LuHouse,
  LuPackage,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuSettings,
  LuTerminal,
  LuWandSparkles,
  LuWrench,
} from 'react-icons/lu';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { routes } from '../../../shared/utils/routes';
import { SidebarNavigationDataTestId } from '@packmind/frontend';
import { ReviewChangesNavLink } from '../../change-proposals/components/ReviewChangesNavLink';
import { useSidebarCollapse } from './SidebarCollapseContext';

const SIDEBAR_WIDTH_EXPANDED = '220px';
const SIDEBAR_WIDTH_COLLAPSED = '48px';

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
    tooltipLabel?: string;
  };
  'data-testid'?: string;
}

export function SidebarNavigationLink(
  props: Readonly<SidebarNavigationLinkProps>,
): React.ReactElement {
  const { url, label, exact = false, icon, badge } = props;
  const { isCollapsed } = useSidebarCollapse();

  const linkContent = (
    <NavLink to={url} end={exact} prefetch="intent">
      {({ isActive }) => (
        <PMLink
          variant="navbar"
          data-active={isActive ? 'true' : undefined}
          as="span"
          data-testid={props['data-testid']}
          display="flex"
          alignItems="center"
          justifyContent={isCollapsed ? 'center' : 'space-between'}
          {...(isCollapsed && { paddingY: 2 })}
          width="100%"
        >
          {isCollapsed ? (
            icon && <PMIcon fontSize="md">{icon}</PMIcon>
          ) : (
            <>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {icon && <PMIcon mr={2}>{icon}</PMIcon>}
                {label}
              </span>
              {badge &&
                (badge.tooltipLabel ? (
                  <PMTooltip label={badge.tooltipLabel}>
                    <PMBadge
                      size="sm"
                      colorScheme={badge.colorScheme || 'purple'}
                      ml={2}
                      fontSize="xs"
                    >
                      {badge.text}
                    </PMBadge>
                  </PMTooltip>
                ) : (
                  <PMBadge
                    size="sm"
                    colorScheme={badge.colorScheme || 'purple'}
                    ml={2}
                    fontSize="xs"
                  >
                    {badge.text}
                  </PMBadge>
                ))}
            </>
          )}
        </PMLink>
      )}
    </NavLink>
  );

  if (isCollapsed) {
    return <PMTooltip label={label}>{linkContent}</PMTooltip>;
  }

  return linkContent;
}

function SidebarCollapseToggle() {
  const { isCollapsed, onToggleCollapse } = useSidebarCollapse();

  return (
    <PMIconButton
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      size="xs"
      variant="ghost"
      onClick={onToggleCollapse}
    >
      {isCollapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />}
    </PMIconButton>
  );
}

export const SidebarNavigation: React.FunctionComponent<
  Readonly<ISidebarNavigationProps>
> = ({ organization }) => {
  const { spaceSlug } = useParams<{ spaceSlug?: string }>();
  const { user } = useAuthContext();
  const { data: spaces } = useGetSpacesQuery();
  const { isCollapsed } = useSidebarCollapse();

  // Use spaceSlug from URL if available, otherwise use first space from query
  const currentSpaceSlug =
    spaceSlug || (spaces && spaces.length > 0 ? spaces[0].slug : undefined);

  const sidebarWidth = isCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  if (!organization) {
    return;
  }

  const orgSlug = organization.slug;

  // Don't render space-scoped links if we don't have a space slug yet
  if (!currentSpaceSlug) {
    return (
      <PMVerticalNav
        headerNav={
          isCollapsed ? undefined : (
            <SidebarOrgaSelector currentOrganization={organization} />
          )
        }
        footerNav={isCollapsed ? undefined : <SidebarAccountMenu />}
        width={sidebarWidth}
        logo={!isCollapsed}
        logoAction={<SidebarCollapseToggle />}
      >
        <PMVerticalNavSection navEntries={[]} />
      </PMVerticalNav>
    );
  }
  return (
    <PMVerticalNav
      headerNav={
        isCollapsed ? undefined : (
          <SidebarOrgaSelector currentOrganization={organization} />
        )
      }
      footerNav={isCollapsed ? undefined : <SidebarAccountMenu />}
      width={sidebarWidth}
      logo={!isCollapsed}
      logoAction={<SidebarCollapseToggle />}
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
        title={isCollapsed ? undefined : 'Playbook'}
        navEntries={[
          <SidebarNavigationLink
            key="standards"
            url={routes.space.toStandards(orgSlug, currentSpaceSlug)}
            label="Standards"
            icon={<LuBookCheck />}
          />,
          <SidebarNavigationLink
            key="recipes"
            url={routes.space.toCommands(orgSlug, currentSpaceSlug)}
            label="Commands"
            icon={<LuTerminal />}
          />,
          <SidebarNavigationLink
            key="skills"
            url={routes.space.toSkills(orgSlug, currentSpaceSlug)}
            label="Skills"
            icon={<LuWandSparkles />}
            data-testid={SidebarNavigationDataTestId.SkillsLink}
          />,
          <ReviewChangesNavLink
            key="change-proposals"
            orgSlug={orgSlug}
            spaceSlug={currentSpaceSlug}
          />,
        ]}
      />
      <PMVerticalNavSection
        title={isCollapsed ? undefined : 'Distribution'}
        navEntries={[
          <SidebarNavigationLink
            key="packages"
            url={routes.space.toPackages(orgSlug, currentSpaceSlug)}
            label="Packages"
            icon={<LuPackage />}
            data-testid={SidebarNavigationDataTestId.PackagesLink}
          />,
          <SidebarNavigationLink
            key="overview"
            url={routes.org.toDeployments(orgSlug)}
            label="Overview"
            icon={<LuEye />}
            badge={{
              text: 'Enterprise',
              colorScheme: 'purple',
              tooltipLabel: 'Coming soon to the Enterprise plan',
            }}
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
        if (!isCollapsed) {
          lastEntries.push(<SidebarHelpMenu key="help" />);
        }
        return <PMVerticalNavSection navEntries={lastEntries} />;
      })()}
    </PMVerticalNav>
  );
};
