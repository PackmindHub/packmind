import { PMBox, PMIcon, PMText, PMVStack } from '@packmind/ui';
import { LuChevronRight, LuPackage } from 'react-icons/lu';

import { descriptorFor, typesForHorizon } from '../data';
import type { Component, PluginSummary, TypeHorizon } from '../types';
import { ComponentReviewMarker } from './ComponentReviewMarker';
import { RowIcon } from './RailPrimitives';

/**
 * One row of the table, and the plugin it came from. The pair travels together
 * rather than the component alone, because the same table is read scoped to one
 * plugin and unscoped across the space, and in the second case the owner is the
 * column that makes the row mean something.
 */
export type ComponentEntry = { component: Component; plugin: PluginSummary };

/**
 * The list of components, grouped by type or flat, shared by the plugin's
 * Content tab and by the space-wide inventory. Extracted the day the second one
 * appeared: two tables of the same objects would have grown two row heights,
 * two date formats and two ideas of what a version chip looks like.
 */
export function ComponentGroups({
  entries,
  horizon,
  grouped,
  showPlugin = false,
  onOpen,
}: Readonly<{
  entries: ComponentEntry[];
  horizon: TypeHorizon;
  /** Off when a type filter is on: the heading would repeat the filter. */
  grouped: boolean;
  showPlugin?: boolean;
  onOpen: (entry: ComponentEntry) => void;
}>) {
  if (!grouped) {
    return (
      <ComponentList
        entries={entries}
        showPlugin={showPlugin}
        onOpen={onOpen}
      />
    );
  }

  const orderedTypes = typesForHorizon(horizon).filter((type) =>
    entries.some((entry) => entry.component.type === type.type),
  );

  return (
    <PMVStack gap={5} align="stretch">
      {orderedTypes.map((type) => (
        <PMBox key={type.type}>
          <PMText
            fontSize="10px"
            fontWeight="semibold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="faded"
          >
            {type.labelPlural}
          </PMText>
          <PMBox paddingTop={1}>
            <ComponentList
              entries={entries.filter(
                (entry) => entry.component.type === type.type,
              )}
              showPlugin={showPlugin}
              onOpen={onOpen}
            />
          </PMBox>
        </PMBox>
      ))}
    </PMVStack>
  );
}

function ComponentList({
  entries,
  showPlugin = false,
  onOpen,
}: Readonly<{
  entries: ComponentEntry[];
  showPlugin?: boolean;
  onOpen: (entry: ComponentEntry) => void;
}>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
    >
      {entries.map((entry, index) => (
        <ComponentRow
          key={entry.component.id}
          entry={entry}
          isFirst={index === 0}
          showPlugin={showPlugin}
          onClick={() => onOpen(entry)}
        />
      ))}
    </PMBox>
  );
}

function ComponentRow({
  entry,
  isFirst,
  showPlugin,
  onClick,
}: Readonly<{
  entry: ComponentEntry;
  isFirst: boolean;
  showPlugin: boolean;
  onClick: () => void;
}>) {
  const { component, plugin } = entry;
  const descriptor = descriptorFor(component.type);

  return (
    <PMBox
      as="button"
      display="flex"
      width="full"
      alignItems="center"
      gap={3}
      textAlign="left"
      paddingX={3}
      paddingY="10px"
      borderTopWidth={isFirst ? '0' : '1px'}
      borderColor="border.tertiary"
      cursor="pointer"
      _hover={{ bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
      onClick={onClick}
    >
      {/* On the name, not on the pair: the same rule the rail beside it follows. */}
      <RowIcon>{descriptor.icon}</RowIcon>
      <PMBox flex={1} minW={0}>
        <PMText as="div" fontSize="sm" fontWeight="medium" truncate>
          {component.name}
        </PMText>
        <PMText as="div" fontSize="xs" color="faded" truncate>
          {component.summary}
        </PMText>
      </PMBox>
      {/*
        A column rather than a word on the second line: read across the space,
        the owner is what the eye runs down. Three plugins carrying their own
        copy of the same standard land on three adjacent rows, and the repeat
        is the finding.
      */}
      {showPlugin && (
        <PMBox
          flexShrink={0}
          width="180px"
          minW={0}
          display="flex"
          alignItems="center"
          gap="6px"
          color="text.faded"
        >
          <PMIcon fontSize="xs" flexShrink={0}>
            <LuPackage />
          </PMIcon>
          <PMBox as="span" fontSize="xs" truncate title={plugin.name}>
            {plugin.name}
          </PMBox>
        </PMBox>
      )}
      {/*
        A fixed width, not the width of the number: v12 is one character wider
        than v5 and every column to its left moved with it, which the eye reads
        as a ragged plugin column once there is one.
      */}
      <PMText
        fontSize="xs"
        color="faded"
        flexShrink={0}
        width="32px"
        textAlign="right"
        fontVariantNumeric="tabular-nums"
      >
        v{component.version}
      </PMText>
      {/* Reserved even when empty, so names and dates stay on the same grid. */}
      <PMBox flexShrink={0} width="76px">
        <ComponentReviewMarker pendingReview={component.pendingReview} />
      </PMBox>
      <PMText
        fontSize="xs"
        color="faded"
        flexShrink={0}
        width="96px"
        textAlign="right"
      >
        {component.updatedLabel}
      </PMText>
      <PMIcon fontSize="xs" color="text.faded" flexShrink={0}>
        <LuChevronRight />
      </PMIcon>
    </PMBox>
  );
}
