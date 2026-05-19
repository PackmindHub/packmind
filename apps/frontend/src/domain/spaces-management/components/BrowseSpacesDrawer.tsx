import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMIcon,
  PMInput,
  PMPortal,
  PMSpinner,
  PMStatus,
  PMText,
} from '@packmind/ui';
import { LuPlus, LuStar, LuUserPlus } from 'react-icons/lu';
import type {
  SpaceId,
  BrowsableSpace,
  UserSpaceWithRole,
} from '@packmind/types';
import { SpaceVisibilityIcon } from '../../organizations/components/sidebar/SpaceVisibilityIcon';
import { sortSpacesByName } from '../utils/sortSpacesByName';

export enum BrowseSpacesTab {
  MY_SPACES = 'my',
  ALL_SPACES = 'all',
}

interface BrowseSpacesDrawerProps {
  mySpaces: UserSpaceWithRole[];
  allSpaces: BrowsableSpace[];
  open: boolean;
  onClose: () => void;
  onSpaceClick: (space: UserSpaceWithRole) => void;
  onJoinSpace: (spaceId: SpaceId, spaceName: string) => void;
  onPinSpace?: (spaceId: SpaceId) => void;
  onUnpinSpace?: (spaceId: SpaceId) => void;
  onCreateSpace?: () => void;
  containerRef?: RefObject<HTMLElement | null>;
  isLoading?: boolean;
  isError?: boolean;
  isJoining?: boolean;
  initialTab?: BrowseSpacesTab;
}

export function BrowseSpacesDrawer({
  mySpaces,
  allSpaces,
  open,
  onClose,
  onSpaceClick,
  onJoinSpace,
  onPinSpace,
  onUnpinSpace,
  onCreateSpace,
  containerRef,
  isLoading,
  isError,
  isJoining,
  initialTab = BrowseSpacesTab.MY_SPACES,
}: Readonly<BrowseSpacesDrawerProps>) {
  const [activeTab, setActiveTab] = useState<BrowseSpacesTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const isSearchDisabled =
    (activeTab === BrowseSpacesTab.MY_SPACES && mySpaces.length === 0) ||
    (activeTab === BrowseSpacesTab.ALL_SPACES && allSpaces.length === 0);

  const searchedMySpaces = searchQuery.trim()
    ? mySpaces.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : mySpaces;
  const filteredMySpaces = [
    ...searchedMySpaces.filter((s) => s.isDefaultSpace),
    ...sortSpacesByName(
      searchedMySpaces.filter((s) => !s.isDefaultSpace && s.pinned),
    ),
    ...sortSpacesByName(
      searchedMySpaces.filter((s) => !s.isDefaultSpace && !s.pinned),
    ),
  ];

  const filteredAllSpaces = sortSpacesByName(
    searchQuery.trim()
      ? allSpaces.filter((s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : allSpaces,
  );

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="start"
      size="sm"
    >
      <PMPortal container={containerRef}>
        <PMDrawer.Backdrop position="absolute" boxSize="full" />
        <PMDrawer.Positioner position="absolute" boxSize="full">
          <PMDrawer.Content>
            <PMDrawer.Header paddingBottom={0} borderBottomWidth="0">
              <PMDrawer.CloseTrigger asChild pos="initial">
                <PMCloseButton size="sm" />
              </PMDrawer.CloseTrigger>
              <PMDrawer.Title fontSize="sm" flex={1}>
                Spaces
              </PMDrawer.Title>
              {onCreateSpace && (
                <PMButton
                  size="xs"
                  variant="secondary"
                  onClick={onCreateSpace}
                  data-testid="browse-spaces-new-button"
                >
                  <PMIcon fontSize="xs">
                    <LuPlus />
                  </PMIcon>
                  New
                </PMButton>
              )}
            </PMDrawer.Header>

            {/* Tabs */}
            <PMBox
              paddingX={4}
              borderBottomWidth="1px"
              borderColor="border.tertiary"
            >
              <PMHStack gap={0}>
                <TabButton
                  label="My spaces"
                  isActive={activeTab === BrowseSpacesTab.MY_SPACES}
                  onClick={() => setActiveTab(BrowseSpacesTab.MY_SPACES)}
                  data-testid="browse-spaces-tab-my-spaces"
                />
                <TabButton
                  label="All spaces"
                  isActive={activeTab === BrowseSpacesTab.ALL_SPACES}
                  onClick={() => setActiveTab(BrowseSpacesTab.ALL_SPACES)}
                  data-testid="browse-spaces-tab-all-spaces"
                />
              </PMHStack>
            </PMBox>

            {/* Search */}
            <PMBox paddingX={3} paddingTop={3} paddingBottom={1} flexShrink={0}>
              <PMInput
                placeholder="Search spaces…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
                disabled={isSearchDisabled}
                data-testid="browse-spaces-search"
              />
            </PMBox>

            <PMDrawer.Body paddingX={1} paddingY={2}>
              {isLoading ? (
                <PMBox
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  paddingY={8}
                >
                  <PMSpinner size="sm" />
                </PMBox>
              ) : isError ? (
                <PMBox paddingX={3} paddingY={8} textAlign="center">
                  <PMText color="faded" fontSize="xs">
                    Failed to load spaces
                  </PMText>
                </PMBox>
              ) : (
                <>
                  {activeTab === BrowseSpacesTab.MY_SPACES && (
                    <MySpacesTab
                      spaces={filteredMySpaces}
                      searchQuery={searchQuery}
                      onSpaceClick={onSpaceClick}
                      onPinSpace={onPinSpace}
                      onUnpinSpace={onUnpinSpace}
                    />
                  )}

                  {activeTab === BrowseSpacesTab.ALL_SPACES && (
                    <AllSpacesTab
                      spaces={filteredAllSpaces}
                      searchQuery={searchQuery}
                      onJoinSpace={onJoinSpace}
                      isJoining={isJoining}
                    />
                  )}
                </>
              )}
            </PMDrawer.Body>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  label,
  isActive,
  onClick,
  'data-testid': dataTestId,
}: Readonly<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  'data-testid'?: string;
}>) {
  return (
    <PMBox
      as="button"
      onClick={onClick}
      paddingX={3}
      paddingY={1.5}
      fontSize="xs"
      fontWeight="medium"
      borderBottomWidth="2px"
      borderColor={isActive ? 'text.primary' : 'transparent'}
      color={isActive ? 'text.primary' : 'text.faded'}
      cursor="pointer"
      _hover={isActive ? undefined : { color: 'text.secondary' }}
      data-testid={dataTestId}
    >
      {label}
    </PMBox>
  );
}

function MySpacesTab({
  spaces,
  searchQuery,
  onSpaceClick,
  onPinSpace,
  onUnpinSpace,
}: Readonly<{
  spaces: UserSpaceWithRole[];
  searchQuery: string;
  onSpaceClick: (space: UserSpaceWithRole) => void;
  onPinSpace?: (spaceId: SpaceId) => void;
  onUnpinSpace?: (spaceId: SpaceId) => void;
}>) {
  if (spaces.length === 0) {
    return (
      <PMBox paddingX={3} paddingY={8} textAlign="center">
        <PMText color="faded" fontSize="xs">
          {searchQuery.trim() ? (
            <>No spaces matching &ldquo;{searchQuery}&rdquo;</>
          ) : (
            'No spaces yet'
          )}
        </PMText>
      </PMBox>
    );
  }

  return (
    <>
      {spaces.map((space) => (
        <PMBox
          key={space.id}
          as="button"
          onClick={() => onSpaceClick(space)}
          display="flex"
          alignItems="center"
          gap={2}
          paddingX={3}
          paddingY={2}
          borderRadius="sm"
          _hover={{ backgroundColor: 'blue.900' }}
          cursor="pointer"
          width="full"
          textAlign="left"
          data-testid={`browse-spaces-my-${space.id}`}
        >
          <PMStatus.Root colorPalette={space.color} as="span" flexShrink={0}>
            <PMStatus.Indicator />
          </PMStatus.Root>
          <PMBox display="flex" alignItems="center" flex={1} minW={0}>
            <PMText
              fontSize="sm"
              color="secondary"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              minW={0}
            >
              {space.name}
            </PMText>
            <SpaceVisibilityIcon type={space.type} />
          </PMBox>
          {!space.isDefaultSpace && onPinSpace && onUnpinSpace && (
            <PMBox
              as="button"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (space.pinned) {
                  onUnpinSpace(space.id);
                } else {
                  onPinSpace(space.id);
                }
              }}
              title={
                space.pinned ? 'Remove from favorites' : 'Add to favorites'
              }
              flexShrink={0}
              cursor="pointer"
              color={space.pinned ? 'yellow.400' : 'text.faded'}
              _hover={{ color: 'yellow.400' }}
              display="flex"
              alignItems="center"
              data-testid={`browse-spaces-pin-${space.id}`}
            >
              <LuStar size={14} fill={space.pinned ? 'currentColor' : 'none'} />
            </PMBox>
          )}
        </PMBox>
      ))}
    </>
  );
}

function AllSpacesTab({
  spaces,
  searchQuery,
  onJoinSpace,
  isJoining,
}: Readonly<{
  spaces: BrowsableSpace[];
  searchQuery: string;
  onJoinSpace: (spaceId: SpaceId, spaceName: string) => void;
  isJoining?: boolean;
}>) {
  if (spaces.length === 0) {
    return (
      <PMBox paddingX={3} paddingY={8} textAlign="center">
        <PMText color="faded" fontSize="xs">
          {searchQuery.trim() ? (
            <>No spaces matching &ldquo;{searchQuery}&rdquo;</>
          ) : (
            'No other spaces to discover'
          )}
        </PMText>
      </PMBox>
    );
  }

  return (
    <>
      {spaces.map((space) => (
        <PMHStack
          key={space.id}
          gap={2}
          paddingX={3}
          paddingY={2}
          borderRadius="sm"
          _hover={{ backgroundColor: 'blue.900' }}
          data-testid={`browse-spaces-all-${space.id}`}
        >
          <PMStatus.Root colorPalette={space.color} as="span" flexShrink={0}>
            <PMStatus.Indicator />
          </PMStatus.Root>
          <PMText
            flex={1}
            minW={0}
            fontSize="sm"
            color="secondary"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {space.name}
          </PMText>
          <PMButton
            size="xs"
            variant="secondary"
            onClick={() => onJoinSpace(space.id, space.name)}
            disabled={isJoining}
            data-testid={`browse-spaces-join-${space.id}`}
          >
            <PMIcon fontSize="xs">
              <LuUserPlus />
            </PMIcon>
            Join
          </PMButton>
        </PMHStack>
      ))}
    </>
  );
}
