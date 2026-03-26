import React from 'react';
import {
  PMAvatar,
  PMBox,
  PMSeparator,
  PMStatus,
  PMText,
  PMTooltip,
} from '@packmind/ui';
import {
  LuBookCheck,
  LuEye,
  LuGitPullRequestArrow,
  LuHouse,
  LuPackage,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import type { Space } from '@packmind/types';
import { SidebarNavigationDataTestId } from '@packmind/frontend';
import { routes } from '../../../../shared/utils/routes';
import { SidebarNavigationLink } from '../SidebarNavigation';
import { useSidebarCollapse } from '../SidebarCollapseContext';
import { SpaceNavSections } from './SpaceNavSections';

interface SpaceNavBlockProps {
  space: Space;
  orgSlug: string;
  isActive: boolean;
  isSelected: boolean;
  onSpaceClick: () => void;
}

const SPACE_COLOR_PALETTES = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'cyan',
  'purple',
  'pink',
] as const;

export function getSpaceColorPalette(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = Math.trunc(hash * 31 + (name.codePointAt(i) ?? 0));
  }
  return SPACE_COLOR_PALETTES[Math.abs(hash) % SPACE_COLOR_PALETTES.length];
}

export function getSpaceInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

export function SpaceNavBlock({
  space,
  orgSlug,
  isActive,
  isSelected,
  onSpaceClick,
}: Readonly<SpaceNavBlockProps>): React.ReactElement {
  const { isCollapsed } = useSidebarCollapse();

  if (isCollapsed) {
    return (
      <CollapsedSpaceNavBlock
        space={space}
        orgSlug={orgSlug}
        isActive={isActive}
        onSpaceClick={onSpaceClick}
      />
    );
  }

  return (
    <ExpandedSpaceNavBlock
      space={space}
      orgSlug={orgSlug}
      isActive={isActive}
      isSelected={isSelected}
      onSpaceClick={onSpaceClick}
    />
  );
}

function CollapsedSpaceNavItems({
  space,
  orgSlug,
}: Readonly<{ space: Space; orgSlug: string }>): React.ReactElement {
  return (
    <>
      <SidebarNavigationLink
        url={routes.space.toDashboard(orgSlug, space.slug)}
        label="Dashboard"
        exact
        icon={<LuHouse />}
      />
      <SidebarNavigationLink
        url={routes.space.toStandards(orgSlug, space.slug)}
        label="Standards"
        icon={<LuBookCheck />}
      />
      <SidebarNavigationLink
        url={routes.space.toCommands(orgSlug, space.slug)}
        label="Commands"
        icon={<LuTerminal />}
      />
      <SidebarNavigationLink
        url={routes.space.toSkills(orgSlug, space.slug)}
        label="Skills"
        icon={<LuWandSparkles />}
        data-testid={SidebarNavigationDataTestId.SkillsLink}
      />
      <SidebarNavigationLink
        url={routes.space.toReviewChanges(orgSlug, space.slug)}
        label="Review changes"
        icon={<LuGitPullRequestArrow />}
      />
      <PMSeparator borderColor="border.primary" my={1} w={'full'} />
      <SidebarNavigationLink
        url={routes.space.toPackages(orgSlug, space.slug)}
        label="Packages"
        icon={<LuPackage />}
        data-testid={SidebarNavigationDataTestId.PackagesLink}
      />
      <SidebarNavigationLink
        url={routes.space.toDeployments(orgSlug, space.slug)}
        label="Overview"
        icon={<LuEye />}
      />
    </>
  );
}

function ExpandedSpaceNavBlock({
  space,
  orgSlug,
  isActive,
  isSelected,
  onSpaceClick,
}: Readonly<SpaceNavBlockProps>): React.ReactElement {
  return (
    <PMBox>
      {!isActive && (
        <SpaceNameRow
          space={space}
          isActive={isActive}
          isSelected={isSelected}
          onSpaceClick={onSpaceClick}
        />
      )}

      {isActive && (
        <PMBox mt={1} bg="background.secondary" borderRadius="md" py={1.5}>
          <PMBox paddingX={3} paddingY={1}>
            <PMText
              fontSize="xs"
              fontWeight="semibold"
              textProps={{ color: 'primary' }}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              <PMStatus.Root
                colorPalette={getSpaceColorPalette(space.name)}
                as="span"
                mr={1.5}
              >
                <PMStatus.Indicator />
              </PMStatus.Root>
              {space.name}
            </PMText>
          </PMBox>
          <SpaceNavSections orgSlug={orgSlug} spaceSlug={space.slug} />
        </PMBox>
      )}
    </PMBox>
  );
}

function CollapsedSpaceNavBlock({
  space,
  orgSlug,
  isActive,
  onSpaceClick,
}: Readonly<Omit<SpaceNavBlockProps, 'isSelected'>>): React.ReactElement {
  const initials = getSpaceInitials(space.name);

  return (
    <PMBox
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={1}
      bg={isActive ? 'background.secondary' : 'transparent'}
      borderRadius="md"
      py={isActive ? 1.5 : 0}
    >
      <PMTooltip label={space.name}>
        <PMBox
          as="button"
          onClick={onSpaceClick}
          cursor="pointer"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <PMAvatar.Root
            size="xs"
            borderRadius="sm"
            backgroundColor={`${getSpaceColorPalette(space.name)}.solid`}
            color="text.primary"
            {...(isActive && {
              outline: '2px solid',
              outlineColor: 'border.primary',
              outlineOffset: '2px',
            })}
          >
            <PMAvatar.Fallback>{initials}</PMAvatar.Fallback>
          </PMAvatar.Root>
        </PMBox>
      </PMTooltip>

      {isActive && (
        <PMBox
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={1}
          mt={1}
        >
          <CollapsedSpaceNavItems space={space} orgSlug={orgSlug} />
        </PMBox>
      )}
    </PMBox>
  );
}

function SpaceNameRow({
  space,
  isActive,
  isSelected,
  onSpaceClick,
}: Readonly<{
  space: Space;
  isActive: boolean;
  isSelected: boolean;
  onSpaceClick: () => void;
}>): React.ReactElement {
  return (
    <PMBox
      as="button"
      onClick={onSpaceClick}
      display="flex"
      alignItems="center"
      gap={2}
      paddingX={2}
      paddingY={1}
      borderRadius="sm"
      cursor="pointer"
      width="full"
      textAlign="left"
      bg="transparent"
      _hover={isActive ? undefined : { backgroundColor: 'blue.900' }}
      transition="background-color 0.15s"
    >
      <PMText
        fontSize="xs"
        fontWeight={isSelected ? 'bold' : isActive ? 'semibold' : 'medium'}
        textProps={{
          color: isSelected ? 'branding.primary' : 'primary',
        }}
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        <PMStatus.Root
          colorPalette={getSpaceColorPalette(space.name)}
          as="span"
          mr={1.5}
        >
          <PMStatus.Indicator />
        </PMStatus.Root>
        {space.name}
      </PMText>
    </PMBox>
  );
}
