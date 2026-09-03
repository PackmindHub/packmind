import React from 'react';
import { PMBox } from '@packmind/ui';
import {
  LuBookCheck,
  LuHouse,
  LuLayers,
  LuPackage,
  LuShare2,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import { SidebarNavigationDataTestId } from '@packmind/frontend';
import { routes } from '../../../../shared/utils/routes';
import { SpaceNavItemLink } from './SpaceNavItemLink';
import { useSpaceNavMode } from '../SpaceNavModeContext';

interface SpaceNavSectionsProps {
  orgSlug: string;
  spaceSlug: string;
}

/**
 * The navigation entries of the active space. Which architecture it renders is
 * a preference of the person looking, held by `SpaceNavModeContext`.
 *
 * Both branches live here rather than behind one data-driven list, because the
 * two lists have nothing in common: the current one names a kind of object per
 * entry, so every component type has to earn a row, and the plugin-first one
 * names the two directions of one loop instead — what we curate, where it
 * landed. Nothing is shared but the link component.
 */
export function SpaceNavSections({
  orgSlug,
  spaceSlug,
}: Readonly<SpaceNavSectionsProps>): React.ReactElement {
  const { mode } = useSpaceNavMode();

  if (mode === 'plugin-first') {
    return <PluginFirstNavSections orgSlug={orgSlug} spaceSlug={spaceSlug} />;
  }

  return <TodayNavSections orgSlug={orgSlug} spaceSlug={spaceSlug} />;
}

/**
 * Two entries, no section headings: with a list this short a heading names one
 * row, which reads as a label rather than as a group.
 *
 * Overview is not among them. The space's index route already redirects away
 * from it in this mode — an entry pointing there would send the reader on a
 * round trip back to Context.
 *
 * Review changes, the third entry the other edition shows, is not part of this
 * one: the change-proposals surface it leads to does not exist here.
 */
function PluginFirstNavSections({
  orgSlug,
  spaceSlug,
}: Readonly<SpaceNavSectionsProps>): React.ReactElement {
  return (
    <>
      {/*
        "Context", not "Packages": everything a package holds is a file a coding
        agent reads, so the entry is named after what the reader curates rather
        than after the container it ships in. The package keeps its name one
        level down, in the rail, where it does mean something.
      */}
      <SpaceNavItemLink
        url={routes.space.toContext(orgSlug, spaceSlug)}
        label="Context"
        icon={<LuLayers />}
      />
      {/*
        The same graph as Context, indexed by destination instead of by package.
        It earns an entry of its own because a repository holds several
        packages: "what has drifted in this repository" cannot be asked from a
        screen scoped to one package, however that screen is arranged.
      */}
      <SpaceNavItemLink
        url={routes.space.toDistribution(orgSlug, spaceSlug)}
        label="Distribution"
        icon={<LuShare2 />}
      />
    </>
  );
}

function TodayNavSections({
  orgSlug,
  spaceSlug,
}: Readonly<SpaceNavSectionsProps>): React.ReactElement {
  return (
    <>
      <SpaceNavItemLink
        url={routes.space.toDashboard(orgSlug, spaceSlug)}
        label="Overview"
        exact
        icon={<LuHouse />}
      />

      <SectionHeading title="Playbook" />
      <SpaceNavItemLink
        url={routes.space.toStandards(orgSlug, spaceSlug)}
        label="Standards"
        icon={<LuBookCheck />}
      />
      <SpaceNavItemLink
        url={routes.space.toCommands(orgSlug, spaceSlug)}
        label="Commands"
        icon={<LuTerminal />}
      />
      <SpaceNavItemLink
        url={routes.space.toSkills(orgSlug, spaceSlug)}
        label="Skills"
        icon={<LuWandSparkles />}
        data-testid={SidebarNavigationDataTestId.SkillsLink}
      />
      <SectionHeading title="Distribution" />
      <SpaceNavItemLink
        url={routes.space.toPackages(orgSlug, spaceSlug)}
        label="Packages"
        icon={<LuPackage />}
        data-testid={SidebarNavigationDataTestId.PackagesLink}
      />
    </>
  );
}

function SectionHeading({
  title,
}: Readonly<{ title: string }>): React.ReactElement {
  return (
    <PMBox
      paddingLeft={3}
      paddingRight={2}
      paddingBottom={0.5}
      paddingTop={2}
      fontSize="9px"
      fontWeight="medium"
      textTransform="uppercase"
      letterSpacing="wider"
      color="text.faded"
      opacity={0.7}
    >
      {title}
    </PMBox>
  );
}
