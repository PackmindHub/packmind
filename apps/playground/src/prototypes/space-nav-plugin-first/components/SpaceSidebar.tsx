import type { ReactNode } from 'react';
import { PMBadge, PMBox, PMHStack, PMIcon, PMText } from '@packmind/ui';
import {
  LuChevronDown,
  LuGitPullRequestArrow,
  LuHouse,
  LuLayers,
  LuPackage,
  LuSearch,
  LuShare2,
  LuSlidersHorizontal,
  LuStore,
} from 'react-icons/lu';

import { SPACES, typesForHorizon } from '../data';
import type { NavMode, TypeHorizon } from '../types';

/**
 * Not an entry, and not in `navEntriesFor`: space settings hangs off the space
 * name, in both architectures. It is the one destination in this sidebar that
 * is about the container rather than about what the space holds, and there is
 * one space row per space — an entry would either be repeated in each of them
 * or silently apply to whichever space happens to be open.
 */
export const SPACE_SETTINGS_KEY = 'space-settings';

export type NavEntry = {
  key: string;
  label: string;
  icon: ReactNode;
  section?: string;
  badge?: number;
  /** Blue counts things waiting, orange counts things broken. */
  badgeTone?: 'info' | 'warning';
};

export type NavBadges = {
  pendingReviews: number;
  destinationsBehind: number;
};

/**
 * The two information architectures, side by side in code so the difference is
 * a data difference rather than two implementations.
 *
 * Note what the `today` branch has to do: it maps over the component types. Every
 * new type lands in the sidebar. The `pluginFirst` branch never mentions them.
 * Its three entries are the three directions of one loop, and none of them is a
 * kind of object: what we write, where it landed, what is coming back. A new
 * component type adds nothing to that list.
 *
 * No Overview. Its three blocks each found a better home: the counts per
 * component type described the architecture this redesign removes, the drift
 * panel became a permanent badge on Distribution rather than a page one has to
 * remember to visit, and the distribution table became Distribution itself. A
 * page kept for the sake of having a landing teaches people not to look at it.
 */
export function navEntriesFor(
  mode: NavMode,
  horizon: TypeHorizon,
  badges: NavBadges,
): NavEntry[] {
  if (mode === 'plugin-first') {
    return [
      /*
       * "Context", not "Plugins". Everything a plugin holds is a file a coding
       * agent reads, so the entry is named after what the user is curating
       * rather than after the container it ships in. The plugin keeps its name
       * one level down, where it does mean something: the unit that is
       * distributed. The icon follows the label: layers, not a crate, since
       * what is stacked here is context and not a shipment. The crate stays on
       * the `today` entry, which still names the container.
       */
      { key: 'plugins', label: 'Context', icon: <LuLayers /> },
      /*
       * The same graph as Context, indexed by destination instead of by plugin.
       * It earns an entry of its own because a repository holds several plugins:
       * "what is behind in this repo" cannot be asked from a screen scoped to
       * one plugin, however that screen is arranged. The fan-out icon says
       * one source, many places, which is exactly what the index inverts.
       *
       * The badge counts destinations, not distributions, because that is what
       * the list under it contains. A badge that counts one thing and opens a
       * list of another teaches the user to distrust both.
       */
      {
        key: 'distribution',
        label: 'Distribution',
        icon: <LuShare2 />,
        badge: badges.destinationsBehind,
        badgeTone: 'warning',
      },
      {
        key: 'review-changes',
        label: 'Review changes',
        icon: <LuGitPullRequestArrow />,
        badge: badges.pendingReviews,
        badgeTone: 'info',
      },
    ];
  }

  return [
    { key: 'overview', label: 'Overview', icon: <LuHouse /> },
    ...typesForHorizon(horizon).map((type) => ({
      key: `type-${type.type}`,
      label: type.labelPlural,
      icon: type.icon,
      section: 'Playbook',
    })),
    {
      key: 'review-changes',
      label: 'Review changes',
      icon: <LuGitPullRequestArrow />,
      section: 'Playbook',
      badge: badges.pendingReviews,
      badgeTone: 'info',
    },
    // Still "Packages" here: this branch reproduces the product as it stands,
    // and the rename is part of what the proposal changes.
    {
      key: 'plugins',
      label: 'Packages',
      icon: <LuPackage />,
      section: 'Distribution',
    },
  ];
}

export function SpaceSidebar({
  mode,
  horizon,
  activeKey,
  onSelect,
  badges,
}: Readonly<{
  mode: NavMode;
  horizon: TypeHorizon;
  activeKey: string;
  onSelect: (key: string) => void;
  badges: NavBadges;
}>) {
  const entries = navEntriesFor(mode, horizon, badges);
  const activeSpace = SPACES[0];
  let lastSection: string | undefined;

  return (
    <PMBox
      width="220px"
      flexShrink={0}
      borderRightWidth="1px"
      borderColor="border.tertiary"
      bg="background.primary"
      display="flex"
      flexDirection="column"
      minH={0}
      overflowY="auto"
    >
      <PMBox paddingX={2} paddingTop={3} paddingBottom={2}>
        <PMHStack
          gap={2}
          paddingX={2}
          paddingY="6px"
          borderRadius="sm"
          borderWidth="1px"
          borderColor="border.tertiary"
        >
          <PMText fontSize="xs" fontWeight="medium" flex={1} truncate>
            Acme Company
          </PMText>
          <PMIcon fontSize="xs" color="text.faded">
            <LuChevronDown />
          </PMIcon>
        </PMHStack>
      </PMBox>

      <PMBox paddingX={2} paddingBottom={3}>
        <SidebarRow
          label="Marketplaces"
          icon={<LuStore />}
          isActive={false}
          onClick={() => undefined}
        />
      </PMBox>

      <PMHStack paddingX={4} paddingBottom={1} justify="space-between">
        <PMText
          fontSize="10px"
          fontWeight="semibold"
          textTransform="uppercase"
          letterSpacing="wider"
          color="faded"
        >
          Spaces
        </PMText>
        <PMIcon fontSize="xs" color="text.faded">
          <LuSearch />
        </PMIcon>
      </PMHStack>

      <PMBox paddingX={2} paddingBottom={4}>
        <PMHStack gap={2} paddingX={2} paddingY={1}>
          <PMBox
            w="8px"
            h="8px"
            borderRadius="full"
            flexShrink={0}
            bg={activeSpace.color}
          />
          <PMText fontSize="xs" fontWeight="semibold" flex={1} truncate>
            {activeSpace.name}
          </PMText>
          {/*
            Where it already is today. On the open space it stays visible; on
            the others it waits for the pointer, so a list of five spaces does
            not read as a list of five settings.
          */}
          <SpaceSettingsButton
            spaceName={activeSpace.name}
            isActive={activeKey === SPACE_SETTINGS_KEY}
            onClick={() => onSelect(SPACE_SETTINGS_KEY)}
          />
        </PMHStack>

        <PMBox paddingTop={1}>
          {entries.map((entry) => {
            const showHeading = entry.section && entry.section !== lastSection;
            lastSection = entry.section;
            return (
              <PMBox key={entry.key}>
                {showHeading && entry.section && (
                  <PMBox
                    paddingLeft={5}
                    paddingRight={2}
                    paddingTop={2}
                    paddingBottom="2px"
                    fontSize="9px"
                    fontWeight="medium"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    color="text.faded"
                    opacity={0.7}
                  >
                    {entry.section}
                  </PMBox>
                )}
                <SidebarRow
                  label={entry.label}
                  icon={entry.icon}
                  badge={entry.badge}
                  badgeTone={entry.badgeTone}
                  indent
                  isActive={activeKey === entry.key}
                  onClick={() => onSelect(entry.key)}
                />
              </PMBox>
            );
          })}
        </PMBox>

        <PMBox paddingTop={3}>
          {SPACES.slice(1).map((space) => (
            <PMHStack
              key={space.id}
              gap={2}
              paddingX={2}
              paddingY={1}
              css={{
                '& .space-settings': { opacity: 0 },
                '&:hover .space-settings': { opacity: 1 },
              }}
            >
              <PMBox
                w="8px"
                h="8px"
                borderRadius="full"
                flexShrink={0}
                bg={space.color}
              />
              <PMText fontSize="xs" color="secondary" flex={1} truncate>
                {space.name}
              </PMText>
              <SpaceSettingsButton
                spaceName={space.name}
                isActive={false}
                revealOnHover
                onClick={() => undefined}
              />
            </PMHStack>
          ))}
        </PMBox>
      </PMBox>
    </PMBox>
  );
}

function SpaceSettingsButton({
  spaceName,
  isActive,
  revealOnHover = false,
  onClick,
}: Readonly<{
  spaceName: string;
  isActive: boolean;
  revealOnHover?: boolean;
  onClick: () => void;
}>) {
  return (
    <PMBox
      as="button"
      className={revealOnHover ? 'space-settings' : undefined}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      width="20px"
      height="20px"
      flexShrink={0}
      borderRadius="sm"
      cursor="pointer"
      bg={isActive ? 'blue.900' : 'transparent'}
      color={isActive ? 'text.primary' : 'text.faded'}
      transition="opacity 150ms ease-out, color 150ms ease-out"
      _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
      aria-label={`Settings for ${spaceName}`}
      title={`Settings for ${spaceName}`}
      onClick={onClick}
    >
      <PMIcon fontSize="xs">
        <LuSlidersHorizontal />
      </PMIcon>
    </PMBox>
  );
}

function SidebarRow({
  label,
  icon,
  badge,
  badgeTone = 'info',
  isActive,
  indent = false,
  onClick,
}: Readonly<{
  label: string;
  icon: ReactNode;
  badge?: number;
  badgeTone?: 'info' | 'warning';
  isActive: boolean;
  indent?: boolean;
  onClick: () => void;
}>) {
  return (
    <PMBox
      as="button"
      display="flex"
      alignItems="center"
      gap={2}
      width="full"
      paddingLeft={indent ? 5 : 2}
      paddingRight={2}
      paddingY={1}
      fontSize="xs"
      borderRadius="sm"
      cursor="pointer"
      textAlign="left"
      bg={isActive ? 'blue.900' : 'transparent'}
      color={isActive ? 'text.primary' : 'text.secondary'}
      fontWeight={isActive ? 'semibold' : 'normal'}
      _hover={isActive ? undefined : { bg: 'blue.800', color: 'text.primary' }}
      transition="background-color 150ms ease-out"
      onClick={onClick}
    >
      <PMIcon
        fontSize="xs"
        flexShrink={0}
        color={isActive ? 'text.secondary' : 'text.faded'}
      >
        {icon}
      </PMIcon>
      <PMBox as="span" flex={1} minW={0} truncate>
        {label}
      </PMBox>
      {badge !== undefined && badge > 0 && (
        <PMBadge
          size="sm"
          fontSize="2xs"
          colorPalette={badgeTone === 'warning' ? 'orange' : 'blue'}
        >
          {badge}
        </PMBadge>
      )}
    </PMBox>
  );
}
