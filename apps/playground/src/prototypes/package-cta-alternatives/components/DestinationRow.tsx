import {
  PMBox,
  PMCheckbox,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuFolderGit2, LuStore } from 'react-icons/lu';
import { STATE_LABEL, STATE_TONE } from '../data';
import type { Destination } from '../types';

/**
 * One landing. The right-hand side carries no button: the two gestures a reader
 * can perform over a destination live on the selection bar, so forty rows show
 * one treatment rather than six.
 */
export function DestinationRow({
  destination,
  isSelected,
  onToggle,
  isLast,
}: Readonly<{
  destination: Destination;
  isSelected: boolean;
  /** Absent for a row nothing can be done to, which takes its box away. */
  onToggle?: () => void;
  isLast: boolean;
}>) {
  return (
    <PMHStack
      paddingX={3}
      paddingY="10px"
      gap={3}
      align="center"
      borderBottomWidth={isLast ? 0 : '1px'}
      borderColor="border.tertiary"
      bg={isSelected ? 'background.secondary' : undefined}
      transition="background-color 120ms ease-out"
    >
      <PMBox width="20px" flexShrink={0}>
        {onToggle && (
          <PMCheckbox
            size="sm"
            checked={isSelected}
            onCheckedChange={onToggle}
            inputProps={{ 'aria-label': `Select ${destination.name}` }}
          />
        )}
      </PMBox>
      <PMIcon color="text.faded" flexShrink={0}>
        {destination.kind === 'marketplace' ? <LuStore /> : <LuFolderGit2 />}
      </PMIcon>
      <PMVStack align="start" gap={0} flex="1" minW={0}>
        <PMText variant="body-important" truncate>
          {destination.name}
        </PMText>
        <PMText variant="small" color="faded" truncate>
          {destination.detail}
        </PMText>
        {destination.note && (
          <PMText variant="small" color="error">
            {destination.note}
          </PMText>
        )}
      </PMVStack>
      <PMText
        variant="small"
        color="secondary"
        fontVariantNumeric="tabular-nums"
        flexShrink={0}
      >
        {destination.version}
      </PMText>
      <PMHStack gap="6px" width="96px" flexShrink={0} justify="end">
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg={STATE_TONE[destination.state]}
        />
        <PMText variant="small" color="secondary">
          {STATE_LABEL[destination.state]}
        </PMText>
      </PMHStack>
    </PMHStack>
  );
}
