import React, { type RefObject, useEffect, useState } from 'react';
import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMLink,
  PMIcon,
  PMIconButton,
  PMButton,
  PMSeparator,
  PMBadge,
  PMTooltip,
  PMBox,
  PMHStack,
  PMText,
  PMMenu,
  PMPortal,
  PMAvatar,
  PMVStack,
  DEFAULT_FEATURE_DOMAIN_MAP,
  GOVERNANCE_FEATURE_KEY,
  isFeatureFlagEnabled,
  MARKETPLACES_FEATURE_KEY,
} from '@packmind/ui';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router';
import {
  AuthContextOrganization,
  useAuthContext,
} from '../../accounts/hooks/useAuthContext';
import { useSignOutMutation } from '../../accounts/api/queries/AuthQueries';
import { SidebarOrgaSelector } from './OrgaSelector';
import { SidebarHelpMenu } from './SidebarHelpMenu';
import {
  LuCircleHelp,
  LuCircleUser,
  LuListChecks,
  LuLogOut,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuSearch,
  LuSettings,
  LuStore,
  LuWrench,
} from 'react-icons/lu';
import { Analytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/analytics';
import {
  SidebarAccountsMenuDataTestIds,
  SidebarNavigationDataTestId,
} from '@packmind/frontend';
import type { Space } from '@packmind/types';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { routes } from '../../../shared/utils/routes';

import { useSidebarCollapse } from './SidebarCollapseContext';
import { SpaceNavBlock } from './sidebar/SpaceNavBlock';
import { SpaceNavPanel } from './sidebar/SpaceNavPanel';
import { BrowseSpaces } from '@packmind/proprietary/frontend/domain/spaces-management/components/BrowseSpaces';
import { BrowseSpacesTab } from '@packmind/proprietary/frontend/domain/spaces-management/components/BrowseSpacesDrawer';
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
          fontSize="xs"
          fontWeight="normal"
          data-active={isActive ? 'true' : undefined}
          as="span"
          data-testid={props['data-testid']}
          display="flex"
          alignItems="center"
          justifyContent={isCollapsed ? 'center' : 'space-between'}
          {...(isCollapsed && { paddingY: 2 })}
          {...(isCollapsed && isActive && { backgroundColor: 'blue.700' })}
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
      size="sm"
      variant="ghost"
      _hover={{
        backgroundColor: 'background.secondary',
      }}
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
  const [lastPanelSpace, setLastPanelSpace] = useState<Space | null>(null);
  const [browseDrawerOpen, setBrowseDrawerOpen] = useState(false);
  const [browseDrawerTab, setBrowseDrawerTab] = useState<BrowseSpacesTab>(
    BrowseSpacesTab.MY_SPACES,
  );

  const openBrowseDrawer = (tab: BrowseSpacesTab) => {
    setBrowseDrawerTab(tab);
    setBrowseDrawerOpen(true);
  };

  const location = useLocation();
  const navigate = useNavigate();
  const signOutMutation = useSignOutMutation();
  const hasGovernanceAccess = isFeatureFlagEnabled({
    featureKeys: [GOVERNANCE_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail: user?.email,
  });

  useEffect(() => {
    setActiveSpacePanel(null);
  }, [location.pathname]);

  // Routes that live outside of any space — on these, no space should appear
  // active in the sidebar (all spaces collapsed).
  const isOrgOnlySection =
    /^\/org\/[^/]+\/(settings|setup|profile|governance)(\/|$)/.test(
      location.pathname,
    );

  const fallbackSpaceSlug =
    isOrgOnlySection || !spaces?.length ? undefined : spaces[0].slug;

  // Use spaceSlug from URL if available, otherwise fall back to the first
  // space — except on org-only sections where we want no active space.
  const currentSpaceSlug = spaceSlug || fallbackSpaceSlug;

  const sidebarWidth = isCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  const panelSpace = spaces?.find((s) => s.id === activeSpacePanel);

  // Keep last opened space mounted so Chakra Drawer can run its close
  // animation and clean up portal/pointer-events before unmounting.
  useEffect(() => {
    if (panelSpace) {
      setLastPanelSpace(panelSpace);
    }
    // panelSpace identity changes every render via .find() — gate on the id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpacePanel, spaces]);

  const handleSignOut = () => {
    const redirectPath = '/sign-in';
    signOutMutation.mutate(undefined, {
      onSuccess: () => {
        try {
          Analytics.reset();
        } catch {
          // ignore analytics reset error
        }
        navigate(redirectPath);
      },
      onError: () => {
        navigate(redirectPath);
      },
    });
  };

  if (!organization) {
    return;
  }

  if (!spaces) {
    return;
  }

  const orgSlug = organization.slug;

  // Marketplaces are administered at the org level and still behind a feature
  // flag, so the main-sidebar entry is shown only to admins whose email opts
  // into the flag — matching the page's own admin guard.
  const canSeeMarketplaces =
    organization.role === 'admin' &&
    isFeatureFlagEnabled({
      featureKeys: [MARKETPLACES_FEATURE_KEY],
      featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
      userEmail: user?.email,
    });

  const defaultSpace = spaces.find((space) => space.isDefaultSpace);

  if (!defaultSpace) {
    return;
  }

  return (
    <>
      <PMVerticalNav
        headerNav={
          isCollapsed ? undefined : (
            <PMHStack gap={0} w="full">
              <PMBox flex={1} minW={0}>
                <SidebarOrgaSelector
                  currentOrganization={organization}
                  hasOrgaSettings={organization.role === 'admin'}
                />
              </PMBox>
              {organization.role === 'admin' && (
                <PMButton
                  aria-label="Settings"
                  variant="secondary"
                  paddingX="2"
                  paddingY="3"
                  minW="auto"
                  ml="-1px"
                  borderLeftRadius="none"
                  onClick={() => navigate(routes.org.toSettings(orgSlug))}
                  data-testid={SidebarNavigationDataTestId.SettingsLink}
                >
                  <PMIcon color="text.tertiary">
                    <LuSettings />
                  </PMIcon>
                </PMButton>
              )}
            </PMHStack>
          )
        }
        width={sidebarWidth}
        logo={!isCollapsed}
        logoAction={<SidebarCollapseToggle />}
        overrideChildrenStackCss={{ minH: 0, paddingBottom: 0 }}
        footerNav={
          <>
            <PMSeparator borderColor={'border.tertiary'} />
            {isCollapsed ? (
              <PMBox display="flex" justifyContent="center" pt={2} pb={3}>
                <PMMenu.Root positioning={{ placement: 'right-start' }}>
                  <PMMenu.Trigger asChild>
                    <PMBox
                      as="button"
                      cursor="pointer"
                      data-testid={
                        SidebarAccountsMenuDataTestIds.OpenSubMenuCTA
                      }
                    >
                      <PMAvatar.Root
                        size="xs"
                        backgroundColor="background.secondary"
                        color="text.primary"
                      >
                        <PMAvatar.Fallback
                          name={user?.displayName ?? user?.email}
                        />
                      </PMAvatar.Root>
                    </PMBox>
                  </PMMenu.Trigger>
                  <PMPortal>
                    <PMMenu.Positioner>
                      <PMMenu.Content>
                        <PMMenu.Item
                          value="profile"
                          onClick={() =>
                            navigate(routes.org.toProfile(orgSlug))
                          }
                          cursor="pointer"
                        >
                          <PMIcon marginRight={2}>
                            <LuCircleUser />
                          </PMIcon>
                          Profile
                        </PMMenu.Item>
                        <PMMenu.Item
                          value="integrations"
                          onClick={() => navigate(routes.org.toSetup(orgSlug))}
                          cursor="pointer"
                          data-testid={
                            SidebarNavigationDataTestId.IntegrationsLink
                          }
                        >
                          <PMIcon marginRight={2}>
                            <LuWrench />
                          </PMIcon>
                          Integrations
                        </PMMenu.Item>
                        <PMMenu.Item
                          value="help"
                          onClick={() =>
                            window.open('https://docs.packmind.com', '_blank')
                          }
                          cursor="pointer"
                        >
                          <PMIcon marginRight={2}>
                            <LuCircleHelp />
                          </PMIcon>
                          Help
                        </PMMenu.Item>
                        <PMMenu.Separator borderColor="border.tertiary" />
                        <PMMenu.Item
                          value="sign-out"
                          onClick={handleSignOut}
                          cursor="pointer"
                          data-testid={
                            SidebarAccountsMenuDataTestIds.SignoutCTA
                          }
                        >
                          <PMIcon marginRight={2}>
                            <LuLogOut />
                          </PMIcon>
                          Log out
                        </PMMenu.Item>
                      </PMMenu.Content>
                    </PMMenu.Positioner>
                  </PMPortal>
                </PMMenu.Root>
              </PMBox>
            ) : (
              <PMBox paddingBottom={3}>
                <PMBox pl={2} pr={4} py={1}>
                  <PMText
                    fontSize="10px"
                    fontWeight="semibold"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    color="faded"
                  >
                    You
                  </PMText>
                </PMBox>
                <PMVerticalNavSection
                  navEntries={[
                    <SidebarNavigationLink
                      key="profile"
                      url={routes.org.toProfile(orgSlug)}
                      label="Profile"
                      icon={<LuCircleUser />}
                    />,
                    <SidebarNavigationLink
                      key="setup"
                      url={routes.org.toSetup(orgSlug)}
                      label="Integrations"
                      icon={<LuWrench />}
                      data-testid={SidebarNavigationDataTestId.IntegrationsLink}
                    />,
                    <SidebarHelpMenu key="help" />,
                    <PMBox
                      key="logout"
                      as="button"
                      display="flex"
                      alignItems="center"
                      w="full"
                      px={2}
                      py={1}
                      fontSize="xs"
                      borderRadius="sm"
                      cursor="pointer"
                      color="text.secondary"
                      _hover={{ bg: 'blue.800', color: 'text.primary' }}
                      transition="background-color 0.15s"
                      textAlign="left"
                      onClick={handleSignOut}
                      data-testid={SidebarAccountsMenuDataTestIds.SignoutCTA}
                    >
                      <PMIcon mr={2}>
                        <LuLogOut />
                      </PMIcon>
                      Log out
                    </PMBox>,
                  ]}
                />
              </PMBox>
            )}
          </>
        }
      >
        <PMBox display="flex" flexDirection="column" flex={1} minH={0} w="full">
          {/* Organization-level entries */}
          {hasGovernanceAccess && (
            <PMBox paddingBottom={2}>
              <PMVerticalNavSection
                navEntries={[
                  <SidebarNavigationLink
                    key="governance"
                    url={routes.org.toGovernance(orgSlug)}
                    label="Governance"
                    icon={<LuListChecks />}
                  />,
                ]}
              />
            </PMBox>
          )}
          {canSeeMarketplaces && (
            <PMBox paddingBottom={2}>
              <PMVerticalNavSection
                navEntries={[
                  <SidebarNavigationLink
                    key="marketplaces"
                    url={routes.org.toMarketplaces(orgSlug)}
                    label="Marketplaces"
                    icon={<LuStore />}
                    aria-label="Marketplaces"
                  />,
                ]}
              />
            </PMBox>
          )}

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
                pl={2}
                pr={4}
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
                <PMBox
                  as="button"
                  color="text.faded"
                  cursor="pointer"
                  _hover={{ color: 'text.primary' }}
                  transition="color 0.15s"
                  onClick={() => openBrowseDrawer(BrowseSpacesTab.ALL_SPACES)}
                  data-testid="browse-spaces-trigger"
                  display="flex"
                  alignItems="center"
                >
                  <PMIcon fontSize="xs">
                    <LuSearch />
                  </PMIcon>
                </PMBox>
              </PMBox>
            )}

            <PMVStack
              alignItems="stretch"
              gap={isCollapsed ? 2 : 0}
              scrollbarColor="{colors.background.tertiary} transparent"
              minHeight={0}
              overflowY="auto"
            >
              <SpaceNavBlock
                key={defaultSpace.id}
                space={defaultSpace}
                orgSlug={orgSlug}
                isActive={defaultSpace.slug === currentSpaceSlug}
                isSelected={activeSpacePanel === defaultSpace.id}
                onSpaceClick={() => setActiveSpacePanel(defaultSpace.id)}
                dataTestId={SidebarNavigationDataTestId.DefaultSpaceRow}
              />

              {spaces && (
                <CustomSpacesNavBlock
                  spaces={spaces}
                  orgSlug={orgSlug}
                  currentSpaceSlug={currentSpaceSlug}
                  selectedSpaceId={activeSpacePanel}
                  onSpaceClick={(space) => setActiveSpacePanel(space.id)}
                  onBrowseMySpaces={() =>
                    openBrowseDrawer(BrowseSpacesTab.MY_SPACES)
                  }
                />
              )}
            </PMVStack>
          </PMBox>
        </PMBox>
      </PMVerticalNav>

      <BrowseSpaces
        open={browseDrawerOpen}
        onClose={() => setBrowseDrawerOpen(false)}
        initialTab={browseDrawerTab}
        containerRef={contentAreaRef}
      />

      {/* SpaceNavPanel drawer */}
      {lastPanelSpace && (
        <SpaceNavPanel
          space={lastPanelSpace}
          orgSlug={orgSlug}
          open={!!panelSpace}
          onClose={() => setActiveSpacePanel(null)}
          containerRef={contentAreaRef}
        />
      )}
    </>
  );
};
