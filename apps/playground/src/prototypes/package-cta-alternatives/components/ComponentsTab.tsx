import { PMBox, PMHStack, PMIcon, PMText, PMVStack } from '@packmind/ui';
import {
  LuBookOpen,
  LuChevronRight,
  LuSquareTerminal,
  LuSparkles,
} from 'react-icons/lu';
import type { Destination, HeaderApproach } from '../types';
import { needsAHand } from '../data';

const COMPONENTS: ReadonlyArray<{
  name: string;
  kind: 'standard' | 'command' | 'skill';
  changed: boolean;
}> = [
  { name: 'Component naming and file layout', kind: 'standard', changed: true },
  { name: 'Testing React components', kind: 'standard', changed: true },
  { name: 'State management conventions', kind: 'standard', changed: false },
  {
    name: 'Accessibility baseline for interactive elements',
    kind: 'standard',
    changed: false,
  },
  { name: 'Create a component', kind: 'command', changed: true },
  {
    name: 'Review a pull request against the frontend standards',
    kind: 'command',
    changed: false,
  },
  { name: 'Scaffold a page', kind: 'command', changed: false },
  { name: 'Design kit usage', kind: 'skill', changed: true },
  { name: 'Working with the playground app', kind: 'skill', changed: false },
];

const KIND_ICON = {
  standard: <LuBookOpen />,
  command: <LuSquareTerminal />,
  skill: <LuSparkles />,
};

/**
 * What the package holds. Mostly scenery for this prototype — the question is
 * about the header — except for the reach strip, which approach C duplicates
 * and therefore has to be seen beside.
 */
export function ComponentsTab({
  approach,
  destinations,
  onOpenDistribution,
}: Readonly<{
  approach: HeaderApproach;
  destinations: readonly Destination[];
  onOpenDistribution: () => void;
}>) {
  const pendingCount = destinations.filter((d) => needsAHand(d.state)).length;

  return (
    <PMBox padding={6}>
      <PMVStack align="stretch" gap={4}>
        {/*
          Where this package reaches, above what is in it. Approach C puts the
          same sentence in the header, which is the one real objection to it:
          read them together here and decide whether one of the two should go.
        */}
        <PMBox
          as="button"
          textAlign="left"
          borderWidth="1px"
          borderColor={approach === 'reach' ? 'orange.400' : 'border.tertiary'}
          borderRadius="sm"
          paddingX={3}
          paddingY={2}
          cursor="pointer"
          _hover={{ bg: 'background.secondary' }}
          onClick={onOpenDistribution}
        >
          <PMHStack gap={2} align="center">
            <PMText variant="small" color="secondary" flex="1">
              {destinations.length === 0
                ? 'Not distributed anywhere yet.'
                : `In ${destinations.length} destination${
                    destinations.length === 1 ? '' : 's'
                  }${pendingCount > 0 ? ` · ${pendingCount} need a hand` : ' · all current'}`}
            </PMText>
            {approach === 'reach' && (
              <PMText variant="small" color="warning">
                ← also in the header now
              </PMText>
            )}
            <PMIcon fontSize="xs" color="text.faded">
              <LuChevronRight />
            </PMIcon>
          </PMHStack>
        </PMBox>

        <PMBox
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="sm"
          overflow="hidden"
        >
          {COMPONENTS.map((component, index) => (
            <PMHStack
              key={component.name}
              paddingX={3}
              paddingY="10px"
              gap={3}
              align="center"
              borderBottomWidth={index === COMPONENTS.length - 1 ? 0 : '1px'}
              borderColor="border.tertiary"
            >
              <PMIcon color="text.faded">{KIND_ICON[component.kind]}</PMIcon>
              <PMText variant="body" flex="1" truncate>
                {component.name}
              </PMText>
              {component.changed && (
                <PMText variant="small" color="warning">
                  Changed since 1.4.0
                </PMText>
              )}
            </PMHStack>
          ))}
        </PMBox>
      </PMVStack>
    </PMBox>
  );
}
