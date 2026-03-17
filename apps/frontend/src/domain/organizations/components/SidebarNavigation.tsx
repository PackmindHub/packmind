import React, { type RefObject, useEffect, useState } from 'react';
import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMLink,
  PMIcon,
  PMIconButton,
  PMSeparator,
  PMBadge,
  PMTooltip,
  PMBox,
  PMText,
} from '@packmind/ui';
import { NavLink, useLocation, useParams } from 'react-router';
import {
  AuthContextOrganization,
  useAuthContext,
} from '../../accounts/hooks/useAuthContext';
import { SidebarAccountMenu } from '../../accounts/components/SidebarAccountMenu';
import { SidebarOrgaSelector } from './OrgaSelector';
import { SidebarHelpMenu } from './SidebarHelpMenu';
import {
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuSettings,
  LuWrench,
} from 'react-icons/lu';
import {
  PMFeatureFlag,
  DEFAULT_FEATURE_DOMAIN_MAP,
  SPACES_MANAGEMENT_FEATURE_KEY,
} from '@packmind/ui';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { routes } from '../../../shared/utils/routes';
import { SidebarNavigationDataTestId } from '@packmind/frontend';
import { useSidebarCollapse } from './SidebarCollapseContext';
import { SpaceNavBlock } from './sidebar/SpaceNavBlock';
import { SpaceNavPanel } from './sidebar/SpaceNavPanel';
import { BrowseSpaces } from '@packmind/proprietary/frontend/domain/spaces-management/components/BrowseSpaces';
import { CustomSpacesNavBlock } from '@packmind/proprietary/frontend/domain/spaces-management/components/CustomSpacesNavBlock';

const SIDEBAR_WIDTH_EXPANDED = '220px';
const SIDEBAR_WIDTH_COLLAPSED = '48px';

interface ISidebarNavigationProps {
  organization: AuthContextOrganization | undefined;
  contentAreaRef: RefObject<HTMLElement | null>;
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
> = ({ organization, contentAreaRef }) => {
  const { spaceSlug } = useParams<{ spaceSlug?: string }>();
  const { data: spaces } = useGetSpacesQuery();
  const { isCollapsed } = useSidebarCollapse();
  const { user } = useAuthContext();
  const [activeSpacePanel, setActiveSpacePanel] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    setActiveSpacePanel(null);
  }, [location.pathname]);

  // Use spaceSlug from URL if available, otherwise use first space from query
  const currentSpaceSlug =
    spaceSlug || (spaces && spaces.length > 0 ? spaces[0].slug : undefined);

  const sidebarWidth = isCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  const panelSpace = spaces?.find((s) => s.id === activeSpacePanel);

  if (!organization) {
    return;
  }

  if (!spaces) {
    return;
  }

  const orgSlug = organization.slug;

  const defaultSpace = spaces.find((space) => space.isDefaultSpace);

  if (!defaultSpace) {
    return;
  }

  return (
    <>
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
        <PMBox display="flex" flexDirection="column" flex={1} minH={0} w="full">
          {/* Spaces -- scrollable */}
          <PMBox
            display="flex"
            flexDirection="column"
            gap={1}
            overflowY="auto"
            flex={1}
            minH={0}
          >
            {!isCollapsed && (
              <PMBox
                paddingX={2}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <PMText
                  fontSize="10px"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="faded"
                >
                  Spaces
                </PMText>
                <PMFeatureFlag
                  featureKeys={[SPACES_MANAGEMENT_FEATURE_KEY]}
                  featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
                  userEmail={user?.email}
                >
                  <BrowseSpaces />
                </PMFeatureFlag>
              </PMBox>
            )}

            <SpaceNavBlock
              key={defaultSpace.id}
              space={defaultSpace}
              orgSlug={orgSlug}
              isActive={defaultSpace.slug === currentSpaceSlug}
              onSpaceClick={() => {
                if (defaultSpace.slug !== currentSpaceSlug) {
                  setActiveSpacePanel(defaultSpace.id);
                }
              }}
            />

            {spaces && (
              <CustomSpacesNavBlock
                spaces={spaces}
                orgSlug={orgSlug}
                currentSpaceSlug={currentSpaceSlug}
                onSpaceClick={(space) => {
                  if (space.slug !== currentSpaceSlug) {
                    setActiveSpacePanel(space.id);
                  }
                }}
              />
            )}
          </PMBox>

          {/* Bottom section -- pinned at bottom */}
          <PMSeparator borderColor={'border.tertiary'} />
          {(() => {
            const lastEntries: React.ReactElement[] = [];

            lastEntries.push(
              <SidebarNavigationLink
                key="setup"
                url={routes.org.toSetup(orgSlug)}
                label="Integrations"
                icon={<LuWrench />}
              />,
            );

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
        </PMBox>
      </PMVerticalNav>

      {/* SpaceNavPanel drawer */}
      {panelSpace && (
        <SpaceNavPanel
          space={panelSpace}
          orgSlug={orgSlug}
          open={true}
          onClose={() => setActiveSpacePanel(null)}
          containerRef={contentAreaRef}
        />
      )}
    </>
  );
};
