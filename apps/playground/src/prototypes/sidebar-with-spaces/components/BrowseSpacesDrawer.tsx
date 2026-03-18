import { useState } from 'react';
import type { RefObject } from 'react';
import {
  PMIcon,
  PMBox,
  PMHStack,
  PMText,
  PMButton,
  PMPortal,
  PMInput,
  PMDrawer,
  PMCloseButton,
} from '@packmind/ui';
import { LuStar, LuClock, LuUserPlus, LuPlus } from 'react-icons/lu';

import type { Space, JoinableSpace } from '../types';
import { SPACE_CATEGORIES, joinableSpaces } from '../data';

export function BrowseSpacesDrawer({
  searchQuery,
  onSearchChange,
  spacesByCategory,
  pinnedSpaces,
  onPinToggle,
  onSpaceClick,
  open,
  onClose,
  containerRef,
}: Readonly<{
  searchQuery: string;
  onSearchChange: (v: string) => void;
  spacesByCategory: { category: string; spaces: Space[] }[];
  pinnedSpaces: Set<string>;
  onPinToggle: (id: string) => void;
  onSpaceClick: (spaceId: string) => void;
  open: boolean;
  onClose: () => void;
  containerRef?: RefObject<HTMLElement | null>;
}>) {
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');

  const allFiltered = searchQuery.trim()
    ? joinableSpaces.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : joinableSpaces;
  const allByCategory = SPACE_CATEGORIES.map((cat) => ({
    category: cat,
    spaces: allFiltered.filter((s) => s.category === cat),
  })).filter((g) => g.spaces.length > 0);

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
              <PMButton size="xs" variant="secondary">
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
                />
                <TabButton
                  label="All spaces"
                  isActive={activeTab === 'all'}
                  onClick={() => setActiveTab('all')}
                />
              </PMHStack>
            </PMBox>

            {/* Search */}
            <PMBox paddingX={3} paddingTop={3} paddingBottom={1} flexShrink={0}>
              <PMInput
                placeholder="Search spaces…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                size="sm"
              />
            </PMBox>

            <PMDrawer.Body paddingX={1} paddingY={2}>
              {activeTab === 'my' && (
                <MySpacesTab
                  spacesByCategory={spacesByCategory}
                  searchQuery={searchQuery}
                  pinnedSpaces={pinnedSpaces}
                  onPinToggle={onPinToggle}
                  onSpaceClick={onSpaceClick}
                />
              )}

              {activeTab === 'all' && (
                <AllSpacesTab
                  allByCategory={allByCategory}
                  searchQuery={searchQuery}
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
}: Readonly<{
  label: string;
  isActive: boolean;
  onClick: () => void;
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
    >
      {label}
    </PMBox>
  );
}

function MySpacesTab({
  spacesByCategory,
  searchQuery,
  pinnedSpaces,
  onPinToggle,
  onSpaceClick,
}: Readonly<{
  spacesByCategory: { category: string; spaces: Space[] }[];
  searchQuery: string;
  pinnedSpaces: Set<string>;
  onPinToggle: (id: string) => void;
  onSpaceClick: (spaceId: string) => void;
}>) {
  if (spacesByCategory.length === 0) {
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
      {spacesByCategory
        .flatMap(({ spaces: catSpaces }) => catSpaces)
        .map((space) => {
          const pinned = pinnedSpaces.has(space.id);
          return (
            <PMBox
              key={space.id}
              role="group"
              display="flex"
              alignItems="center"
              gap={2}
              paddingX={3}
              paddingY={2}
              borderRadius="sm"
              _hover={{ bg: 'blue.800' }}
              cursor="pointer"
            >
              <PMBox
                as="button"
                onClick={() => onSpaceClick(space.id)}
                display="flex"
                alignItems="center"
                gap={2}
                flex={1}
                minW={0}
                textAlign="left"
              >
                <PMBox
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  flexShrink={0}
                  bg={space.color}
                />
                {space.icon && (
                  <PMIcon fontSize="sm" color="text.tertiary">
                    {space.icon}
                  </PMIcon>
                )}
                <PMText
                  fontSize="sm"
                  color="secondary"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {space.name}
                </PMText>
              </PMBox>
              {space.id !== 'default' && (
                <PMBox
                  as="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onPinToggle(space.id);
                  }}
                  title={pinned ? 'Unpin space' : 'Pin space'}
                  flexShrink={0}
                  color={pinned ? 'yellow.400' : 'text.faded'}
                  _hover={{ color: 'yellow.400' }}
                  display="flex"
                  alignItems="center"
                >
                  <LuStar size={12} fill={pinned ? 'currentColor' : 'none'} />
                </PMBox>
              )}
            </PMBox>
          );
        })}
    </>
  );
}

function AllSpacesTab({
  allByCategory,
  searchQuery,
}: Readonly<{
  allByCategory: { category: string; spaces: JoinableSpace[] }[];
  searchQuery: string;
}>) {
  const allFlat = allByCategory.flatMap(({ spaces: catSpaces }) => catSpaces);
  const requestedSpaces = allFlat.filter((s) => s.requiresRequest);
  const openSpaces = allFlat.filter((s) => !s.requiresRequest);

  if (allFlat.length === 0) {
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
      {requestedSpaces.length > 0 && (
        <PMBox>
          <SectionHeading>Requested</SectionHeading>
          {requestedSpaces.map((space) => (
            <JoinableSpaceRow key={space.id} space={space} />
          ))}
        </PMBox>
      )}
      {openSpaces.length > 0 && (
        <PMBox>
          {requestedSpaces.length > 0 && (
            <SectionHeading>Organization&apos;s spaces</SectionHeading>
          )}
          {openSpaces.map((space) => (
            <JoinableSpaceRow key={space.id} space={space} />
          ))}
        </PMBox>
      )}
    </>
  );
}

function SectionHeading({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PMBox
      paddingX={3}
      paddingY={2}
      fontSize="10px"
      fontWeight="semibold"
      textTransform="uppercase"
      letterSpacing="wider"
      color="text.faded"
    >
      {children}
    </PMBox>
  );
}

function JoinableSpaceRow({ space }: Readonly<{ space: JoinableSpace }>) {
  return (
    <PMHStack
      gap={2}
      paddingX={3}
      paddingY={2}
      borderRadius="sm"
      _hover={{ bg: 'blue.800' }}
    >
      <PMBox
        w="8px"
        h="8px"
        borderRadius="full"
        flexShrink={0}
        bg={space.color}
      />
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
      {space.requiresRequest ? (
        <PMButton size="xs" variant="tertiary">
          <PMIcon fontSize="xs">
            <LuClock />
          </PMIcon>
          Requested
        </PMButton>
      ) : (
        <PMButton size="xs" variant="secondary">
          <PMIcon fontSize="xs">
            <LuUserPlus />
          </PMIcon>
          Join
        </PMButton>
      )}
    </PMHStack>
  );
}
