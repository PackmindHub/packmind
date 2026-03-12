import { useRef, useState } from 'react';
import {
  PMVerticalNav,
  PMIcon,
  PMIconButton,
  PMBox,
  PMHStack,
  PMButton,
  PMText,
  PMAvatar,
  PMMenu,
  PMPortal,
} from '@packmind/ui';

import {
  LuWrench,
  LuSettings,
  LuCircleHelp,
  LuLogOut,
  LuPanelLeftClose,
  LuPanelLeftOpen,
} from 'react-icons/lu';

import type { Space } from './types';
import { SPACE_CATEGORIES, spaces } from './data';
import { StubOrgSelector } from './components/StubOrgSelector';
import { SpaceNavBlock } from './components/SpaceNavBlock';
import { SpaceNavPanel } from './components/SpaceNavPanel';
import { BrowseSpacesDrawer } from './components/BrowseSpacesDrawer';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toggleInSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function getSpaceInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ── Collapsed sub-components ─────────────────────────────────────────────────

function CollapsedSpaceAvatar({
  space,
  isActive,
  onClick,
}: Readonly<{
  space: Space;
  isActive: boolean;
  onClick: () => void;
}>) {
  return (
    <PMBox
      as="button"
      display="flex"
      justifyContent="center"
      w="full"
      py={0.5}
      onClick={onClick}
      cursor="pointer"
      title={space.name}
    >
      <PMAvatar.Root
        size="xs"
        backgroundColor={space.color}
        color="white"
        borderRadius="sm"
        outline={isActive ? '2px solid' : 'none'}
        outlineColor={isActive ? space.color : 'transparent'}
        outlineOffset="2px"
      >
        <PMAvatar.Fallback fontWeight="bold" fontSize="2xs" borderRadius="sm">
          {getSpaceInitials(space.name)}
        </PMAvatar.Fallback>
      </PMAvatar.Root>
    </PMBox>
  );
}

// ── Main prototype ───────────────────────────────────────────────────────────

export default function SidebarWithSpacesPrototype() {
  const [activeSpacePanel, setActiveSpacePanel] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState('default:standards');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [pinnedSpaces, setPinnedSpaces] = useState<Set<string>>(
    new Set(['default', 'frontend']),
  );
  const [recentSpaceIds, setRecentSpaceIds] = useState<string[]>([
    'security',
    'backend',
    'platform',
  ]);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const togglePin = (id: string) =>
    setPinnedSpaces((prev) => toggleInSet(prev, id));

  const recordRecentSpace = (spaceId: string) => {
    setRecentSpaceIds((prev) => {
      const next = prev.filter((id) => id !== spaceId);
      next.unshift(spaceId);
      return next.slice(0, 5);
    });
  };

  const handleItemClick = (key: string) => {
    setActiveKey(key);
    setActiveSpacePanel(null);
    const spaceId = key.split(':')[0];
    if (spaces.some((s) => s.id === spaceId)) {
      recordRecentSpace(spaceId);
    }
  };

  const handleBrowseSpaceClick = (spaceId: string) => {
    const space = spaces.find((s) => s.id === spaceId);
    if (space) {
      const firstItem = space.sections[0]?.items[0];
      if (firstItem) {
        setActiveKey(`${spaceId}:${firstItem.id}`);
        recordRecentSpace(spaceId);
      }
      setActiveSpacePanel(spaceId);
    }
    setBrowseOpen(false);
    setBrowseSearch('');
  };

  const drawerContainerRef = useRef<HTMLDivElement>(null);

  const pinnedList = spaces.filter((s) => pinnedSpaces.has(s.id));
  const recentList = recentSpaceIds
    .filter((id) => !pinnedSpaces.has(id))
    .map((id) => spaces.find((s) => s.id === id))
    .filter((s): s is Space => s !== undefined)
    .slice(0, 3);

  const browseFiltered = browseSearch.trim()
    ? spaces.filter((s) =>
        s.name.toLowerCase().includes(browseSearch.toLowerCase()),
      )
    : spaces;
  const spacesByCategory = SPACE_CATEGORIES.map((cat) => ({
    category: cat,
    spaces: browseFiltered.filter((s) => s.category === cat),
  })).filter((group) => group.spaces.length > 0);

  const activeSpace = spaces.find((s) => activeKey.startsWith(s.id + ':'));
  const activeItem = activeSpace?.sections
    .flatMap((s) => s.items)
    .find((i) => activeKey === `${activeSpace.id}:${i.id}`);

  const sidebarWidth = isCollapsed ? '48px' : '220px';

  const label =
    activeItem && activeSpace
      ? `${activeSpace.name} / ${activeItem.label}`
      : 'Select a section from the sidebar';

  return (
    <PMHStack height="100%" gap={0} align="stretch">
      {/* Sidebar */}
      <PMVerticalNav
        headerNav={
          isCollapsed ? undefined : (
            <PMHStack gap={0} w="full">
              <PMBox flex={1} minW={0}>
                <StubOrgSelector />
              </PMBox>
              <PMButton
                aria-label="Settings"
                variant="secondary"
                paddingX="2"
                paddingY="3"
                minW="auto"
                ml="-1px"
                onClick={() => setActiveKey('bottom:settings')}
              >
                <PMIcon color="text.tertiary">
                  <LuSettings />
                </PMIcon>
              </PMButton>
            </PMHStack>
          )
        }
        footerNav={undefined}
        width={sidebarWidth}
        logo={!isCollapsed}
        logoAction={
          <PMIconButton
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            size="xs"
            variant="ghost"
            onClick={() => setIsCollapsed((v) => !v)}
          >
            {isCollapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />}
          </PMIconButton>
        }
        showLogoContainer
      >
        {/* Outer wrapper: fills parent VStack, prevents overflow */}
        <PMBox display="flex" flexDirection="column" flex={1} minH={0} w="full">
          {/* Spaces — scrollable */}
          <PMBox
            display="flex"
            flexDirection="column"
            gap={3}
            overflowY="auto"
            flex={1}
            minH={0}
          >
            {/* Spaces header */}
            {!isCollapsed && (
              <PMBox
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                paddingX={2}
              >
                <PMBox
                  fontSize="10px"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="text.faded"
                >
                  Spaces
                </PMBox>
                <PMBox
                  as="button"
                  fontSize="10px"
                  color="text.faded"
                  cursor="pointer"
                  _hover={{ color: 'text.primary' }}
                  transition="color 0.15s"
                  onClick={() => setBrowseOpen(true)}
                >
                  Browse
                </PMBox>
              </PMBox>
            )}

            {/* Pinned spaces */}
            {pinnedList.length > 0 && !isCollapsed && (
              <PMBox>
                {pinnedList.map((space) => {
                  const isSpaceActive = activeKey.startsWith(space.id + ':');
                  return (
                    <SpaceNavBlock
                      key={space.id}
                      space={space}
                      isActive={isSpaceActive}
                      activeKey={activeKey}
                      onSpaceClick={() => {
                        if (!isSpaceActive) setActiveSpacePanel(space.id);
                      }}
                      onItemClick={isSpaceActive ? handleItemClick : undefined}
                      isPinned={true}
                      onPinToggle={() => togglePin(space.id)}
                    />
                  );
                })}
              </PMBox>
            )}

            {/* Collapsed pinned spaces */}
            {pinnedList.length > 0 && isCollapsed && (
              <PMBox display="flex" flexDirection="column" gap={0.5}>
                {pinnedList.map((space) => {
                  const isSpaceActive = activeKey.startsWith(space.id + ':');
                  return (
                    <CollapsedSpaceAvatar
                      key={space.id}
                      space={space}
                      isActive={isSpaceActive}
                      onClick={() => setActiveSpacePanel(space.id)}
                    />
                  );
                })}
              </PMBox>
            )}

            {/* Recent spaces */}
            {recentList.length > 0 && !isCollapsed && (
              <PMBox>
                <PMBox
                  paddingX={2}
                  marginBottom={1}
                  fontSize="10px"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="text.faded"
                >
                  Recent
                </PMBox>
                {recentList.map((space) => {
                  const isSpaceActive = activeKey.startsWith(space.id + ':');
                  return (
                    <SpaceNavBlock
                      key={space.id}
                      space={space}
                      isActive={isSpaceActive}
                      activeKey={activeKey}
                      onSpaceClick={() => {
                        if (!isSpaceActive) setActiveSpacePanel(space.id);
                      }}
                      onItemClick={isSpaceActive ? handleItemClick : undefined}
                      isPinned={false}
                      onPinToggle={() => togglePin(space.id)}
                    />
                  );
                })}
              </PMBox>
            )}
          </PMBox>

          {/* You section — always visible, pinned at bottom */}
          {isCollapsed ? (
            <PMBox
              w="full"
              borderTopWidth="1px"
              borderColor="{colors.border.tertiary}"
              paddingTop={3}
              display="flex"
              justifyContent="center"
              flexShrink={0}
            >
              <PMMenu.Root positioning={{ placement: 'right-end' }}>
                <PMMenu.Trigger asChild>
                  <PMBox
                    cursor="pointer"
                    display="inline-flex"
                    _hover={{ opacity: 0.8 }}
                  >
                    <PMAvatar.Root
                      size="xs"
                      backgroundColor="background.secondary"
                      color="text.primary"
                    >
                      <PMAvatar.Fallback fontSize="2xs" fontWeight="bold">
                        You
                      </PMAvatar.Fallback>
                    </PMAvatar.Root>
                  </PMBox>
                </PMMenu.Trigger>
                <PMPortal>
                  <PMMenu.Positioner>
                    <PMMenu.Content>
                      <PMMenu.Item
                        value="integrations"
                        cursor="pointer"
                        onClick={() => setActiveKey('bottom:integrations')}
                      >
                        <PMIcon fontSize="sm">
                          <LuWrench />
                        </PMIcon>
                        Integrations
                      </PMMenu.Item>
                      <PMMenu.Item
                        value="help"
                        cursor="pointer"
                        onClick={() => setActiveKey('bottom:help')}
                      >
                        <PMIcon fontSize="sm">
                          <LuCircleHelp />
                        </PMIcon>
                        Help
                      </PMMenu.Item>
                      <PMMenu.Separator borderColor="border.tertiary" />
                      <PMMenu.Item
                        value="logout"
                        cursor="pointer"
                        onClick={() => setActiveKey('bottom:logout')}
                      >
                        <PMIcon fontSize="sm">
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
            <PMBox
              w="full"
              borderTopWidth="1px"
              borderColor="{colors.border.tertiary}"
              paddingTop={3}
              flexShrink={0}
            >
              <PMBox
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                paddingX={2}
                marginBottom={1}
              >
                <PMBox
                  fontSize="10px"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="text.faded"
                >
                  You
                </PMBox>
              </PMBox>
              {[
                {
                  label: 'Integrations',
                  icon: <LuWrench />,
                  key: 'bottom:integrations',
                },
                { label: 'Help', icon: <LuCircleHelp />, key: 'bottom:help' },
                { label: 'Log out', icon: <LuLogOut />, key: 'bottom:logout' },
              ].map((item) => (
                <PMBox
                  key={item.key}
                  as="button"
                  display="flex"
                  alignItems="center"
                  gap={2}
                  w="full"
                  paddingX={2}
                  py={1}
                  fontSize="xs"
                  fontWeight="normal"
                  color="text.secondary"
                  borderRadius="sm"
                  cursor="pointer"
                  _hover={{ bg: 'blue.800', color: 'text.primary' }}
                  transition="background-color 0.15s"
                  textAlign="left"
                  onClick={() => setActiveKey(item.key)}
                >
                  <PMIcon fontSize="xs" color="text.faded">
                    {item.icon}
                  </PMIcon>
                  {item.label}
                </PMBox>
              ))}
            </PMBox>
          )}
        </PMBox>
      </PMVerticalNav>

      {/* Main content area (also serves as drawer container) */}
      <div
        ref={drawerContainerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PMText color="faded" fontSize="sm">
          {label}
        </PMText>

        {/* Space nav drawer */}
        {(() => {
          const panelSpace = activeSpacePanel
            ? spaces.find((s) => s.id === activeSpacePanel)
            : undefined;
          return panelSpace ? (
            <SpaceNavPanel
              space={panelSpace}
              activeKey={activeKey}
              onItemClick={handleItemClick}
              open={true}
              onClose={() => setActiveSpacePanel(null)}
              containerRef={drawerContainerRef}
            />
          ) : null;
        })()}

        {/* Browse spaces drawer */}
        <BrowseSpacesDrawer
          searchQuery={browseSearch}
          onSearchChange={setBrowseSearch}
          spacesByCategory={spacesByCategory}
          pinnedSpaces={pinnedSpaces}
          onPinToggle={togglePin}
          onSpaceClick={handleBrowseSpaceClick}
          open={browseOpen}
          onClose={() => {
            setBrowseOpen(false);
            setBrowseSearch('');
          }}
          containerRef={drawerContainerRef}
        />
      </div>
    </PMHStack>
  );
}
