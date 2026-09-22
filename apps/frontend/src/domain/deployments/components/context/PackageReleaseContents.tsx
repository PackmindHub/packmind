import { Fragment } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMLink,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  OrganizationId,
  PackageId,
  PackageReleaseContent,
  SpaceId,
} from '@packmind/types';
import { useGetPackageReleaseQuery } from '../../api/queries/DeploymentsQueries';
import { PACKAGE_MESSAGES } from '../../constants/messages';
import {
  COMPONENT_TYPE_LABELS,
  type ContextComponentType,
} from './buildPackageContext';
import { COMPONENT_TYPE_ICONS } from './ContextComponentList';

/** One pinned component, whatever family it came from. */
type PinnedComponent = {
  key: string;
  name: string;
  version: number;
};

/**
 * What a release pins, in place of the package's own list.
 *
 * Read only, and visibly so: no checkbox, no row menu, no link out. A release
 * is immutable, and a list that looks like the editable one is an invitation to
 * try to edit it. The rows carry the version each component was frozen at,
 * which is the whole reason to open a past release rather than read the
 * changelog of the components themselves.
 *
 * Nothing here links to a component. The pane can show a component as it stands
 * now, which is not what this release pins, and sending a reader from 1.1.0 to
 * today's version of a standard under the same name would be the one lie this
 * surface must not tell.
 */
export function PackageReleaseContents(
  props: Readonly<{
    packageId: PackageId;
    spaceId: SpaceId;
    organizationId: OrganizationId;
    version: string;
    /** Back to the editable package, which is where changes are made. */
    onReadUnreleased: () => void;
  }>,
) {
  const { data, isLoading, isError } = useGetPackageReleaseQuery(
    props.organizationId,
    props.spaceId,
    props.packageId,
    props.version,
  );

  if (isLoading) {
    return (
      <PMHStack gap={2} align="center">
        <PMSpinner size="sm" />
        <PMText fontSize="sm" color="secondary">
          Reading {props.version}…
        </PMText>
      </PMHStack>
    );
  }

  if (isError || !data) {
    return (
      <PMText fontSize="sm" color="secondary">
        {props.version} could not be read. It may have been cut by a space you
        no longer have access to.
      </PMText>
    );
  }

  const sections = releaseSections(data.release);
  const pinned = sections.reduce(
    (count, section) => count + section.components.length,
    0,
  );

  return (
    <PMVStack gap={5} align="stretch">
      {/*
        Above the list, in the shape the reach strip uses one state over: a
        sentence about the whole, then the list of the parts. It names the way
        back rather than leaving the reader to find the menu again, which is the
        rule every other dead end on this surface follows.
      */}
      <PMHStack
        justify="space-between"
        align="center"
        gap={3}
        paddingX={3}
        paddingY={2}
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="sm"
        bg="background.secondary"
      >
        <PMText fontSize="xs" color="secondary">
          {props.version} pins {pinned} component{pinned === 1 ? '' : 's'} at
          the versions below.
        </PMText>
        <PMLink as="button" fontSize="xs" onClick={props.onReadUnreleased}>
          {PACKAGE_MESSAGES.release.unreleased}
        </PMLink>
      </PMHStack>

      {sections.length === 0 ? (
        <PMText fontSize="sm" color="secondary">
          {props.version} pins no component.
        </PMText>
      ) : (
        <PMBox
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="sm"
          overflow="hidden"
        >
          {sections.map((section, index) => (
            <Fragment key={section.type}>
              <PMHStack
                gap={2}
                align="center"
                paddingX={3}
                paddingY="6px"
                bg="background.secondary"
                borderTopWidth={index === 0 ? '0' : '1px'}
                borderColor="border.tertiary"
              >
                <PMIcon fontSize="xs" color="secondary">
                  {COMPONENT_TYPE_ICONS[section.type]}
                </PMIcon>
                <PMText fontSize="xs" fontWeight="medium">
                  {COMPONENT_TYPE_LABELS[section.type]}
                </PMText>
                <PMText
                  fontSize="xs"
                  color="faded"
                  fontVariantNumeric="tabular-nums"
                >
                  {section.components.length}
                </PMText>
              </PMHStack>
              {section.components.map((component) => (
                <PMHStack
                  key={component.key}
                  gap={3}
                  justify="space-between"
                  align="center"
                  paddingX={3}
                  paddingY={2}
                  borderTopWidth="1px"
                  borderColor="border.tertiary"
                >
                  <PMText fontSize="sm" truncate>
                    {component.name}
                  </PMText>
                  <PMText
                    fontSize="xs"
                    color="faded"
                    flexShrink={0}
                    fontVariantNumeric="tabular-nums"
                  >
                    v{component.version}
                  </PMText>
                </PMHStack>
              ))}
            </Fragment>
          ))}
        </PMBox>
      )}
    </PMVStack>
  );
}

/**
 * The release's three families in the order the package's own list uses, with
 * the empty ones dropped.
 *
 * The same rule the working copy follows: a band exists because the package has
 * something of that type, so an empty one would be a heading over nothing.
 */
function releaseSections(
  release: PackageReleaseContent,
): { type: ContextComponentType; components: PinnedComponent[] }[] {
  const sections: {
    type: ContextComponentType;
    components: PinnedComponent[];
  }[] = [
    {
      type: 'standard',
      components: release.standardVersions.map((version) => ({
        key: version.id,
        name: version.name,
        version: version.version,
      })),
    },
    {
      type: 'command',
      components: release.recipeVersions.map((version) => ({
        key: version.id,
        name: version.name,
        version: version.version,
      })),
    },
    {
      type: 'skill',
      components: release.skillVersions.map((version) => ({
        key: version.id,
        name: version.name,
        version: version.version,
      })),
    },
  ];

  return sections.filter((section) => section.components.length > 0);
}

/** How many components a release pins, for the count on the tab above it. */
export function pinnedComponentCount(release: PackageReleaseContent): number {
  return (
    release.standardVersions.length +
    release.recipeVersions.length +
    release.skillVersions.length
  );
}
