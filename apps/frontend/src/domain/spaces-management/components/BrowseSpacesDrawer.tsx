import { useState } from 'react';
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
  PMStatus,
  PMText,
} from '@packmind/ui';
import { LuPlus, LuUserPlus } from 'react-icons/lu';
import type { Space, SpaceId, BrowsableSpace } from '@packmind/types';
import { SpaceType } from '@packmind/types';
import { getSpaceColorPalette } from '../../organizations/components/sidebar/SpaceNavBlock';

interface BrowseSpacesDrawerProps {
  mySpaces: Space[];
  allSpaces: BrowsableSpace[];
  open: boolean;
  onClose: () => void;
  onSpaceClick: (space: Space) => void;
  onJoinSpace: (spaceId: SpaceId) => void;
  onCreateSpace: () => void;
  containerRef?: RefObject<HTMLElement | null>;
}

export function BrowseSpacesDrawer({
  mySpaces,
  allSpaces,
  open,
  onClose,
  onSpaceClick,
  onJoinSpace,
  onCreateSpace,
  containerRef,
}: Readonly<BrowseSpacesDrawerProps>) {
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMySpaces = searchQuery.trim()
    ? mySpaces.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : mySpaces;

  const filteredAllSpaces = searchQuery.trim()
    ? allSpaces.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allSpaces;

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
        <PMDrawer.Backdrop position="absolute" />
        <PMDrawer.Positioner position="absolute">
          <PMDrawer.Content>
            <PMDrawer.Header paddingBottom={0} borderBottomWidth="0">
              <PMDrawer.CloseTrigger asChild pos="initial">
                <PMCloseButton size="sm" />
              </PMDrawer.CloseTrigger>
              <PMDrawer.Title fontSize="sm" flex={1}>
                Spaces
              </PMDrawer.Title>
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
            </PMDrawer.Header>

            {/* Tabs */}
            <PMBox
              paddingX={4}
              borderBottomWidth="1px"
              borderColor="{colors.border.tertiary}"
            >
              <PMHStack gap={0}>
                <TabButton
                  label="My spaces"
                  isActive={activeTab === 'my'}
                  onClick={() => setActiveTab('my')}
                  data-testid="browse-spaces-tab-my-spaces"
                />
                <TabButton
                  label="All spaces"
                  isActive={activeTab === 'all'}
                  onClick={() => setActiveTab('all')}
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
                data-testid="browse-spaces-search"
              />
            </PMBox>

            <PMDrawer.Body paddingX={1} paddingY={2}>
              {activeTab === 'my' && (
                <MySpacesTab
                  spaces={filteredMySpaces}
                  searchQuery={searchQuery}
                  onSpaceClick={onSpaceClick}
                />
              )}

              {activeTab === 'all' && (
                <AllSpacesTab
                  spaces={filteredAllSpaces}
                  searchQuery={searchQuery}
                  onJoinSpace={onJoinSpace}
                />
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
}: Readonly<{
  spaces: Space[];
  searchQuery: string;
  onSpaceClick: (space: Space) => void;
}>) {
  if (spaces.length === 0) {
    return (
      <PMBox paddingX={3} paddingY={8} textAlign="center">
        <PMText color="faded" fontSize="xs">
          No spaces matching &ldquo;{searchQuery}&rdquo;
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
          _hover={{ bg: 'bg.muted' }}
          cursor="pointer"
          width="full"
          textAlign="left"
          data-testid={`browse-spaces-my-${space.id}`}
        >
          <PMStatus.Root
            colorPalette={getSpaceColorPalette(space.name)}
            as="span"
            flexShrink={0}
          >
            <PMStatus.Indicator />
          </PMStatus.Root>
          <PMText
            fontSize="sm"
            color="secondary"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            flex={1}
            minW={0}
          >
            {space.name}
          </PMText>
        </PMBox>
      ))}
    </>
  );
}

function AllSpacesTab({
  spaces,
  searchQuery,
  onJoinSpace,
}: Readonly<{
  spaces: BrowsableSpace[];
  searchQuery: string;
  onJoinSpace: (spaceId: SpaceId) => void;
}>) {
  if (spaces.length === 0) {
    return (
      <PMBox paddingX={3} paddingY={8} textAlign="center">
        <PMText color="faded" fontSize="xs">
          No spaces matching &ldquo;{searchQuery}&rdquo;
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
          _hover={{ bg: 'bg.muted' }}
          data-testid={`browse-spaces-all-${space.id}`}
        >
          <PMStatus.Root
            colorPalette={getSpaceColorPalette(space.name)}
            as="span"
            flexShrink={0}
          >
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
          {space.type === SpaceType.open && (
            <PMButton
              size="xs"
              variant="secondary"
              onClick={() => onJoinSpace(space.id)}
              data-testid={`browse-spaces-join-${space.id}`}
            >
              <PMIcon fontSize="xs">
                <LuUserPlus />
              </PMIcon>
              Join
            </PMButton>
          )}
        </PMHStack>
      ))}
    </>
  );
}
