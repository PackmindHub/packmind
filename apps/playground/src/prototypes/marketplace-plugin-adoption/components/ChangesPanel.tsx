import {
  PMBadge,
  PMBox,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCheck, LuMinus, LuPencil, LuPlus } from 'react-icons/lu';
import type { PluginChange, Plugin } from '../types';

// Also plain — present so the single remaining tab strip can be reviewed whole.

export function ChangesPanel({ plugin }: Readonly<{ plugin: Plugin }>) {
  if (plugin.changes.length === 0) {
    return (
      <PMHStack gap={2} align="center" paddingTop={4}>
        <PMIcon fontSize="sm" color="green.500">
          <LuCheck />
        </PMIcon>
        <PMText fontSize="sm" color="secondary">
          The marketplace matches the curated package. Nothing to publish.
        </PMText>
      </PMHStack>
    );
  }

  return (
    <PMVStack gap={2.5} align="stretch" paddingTop={4}>
      <PMText fontSize="sm" color="primary" fontWeight="medium">
        {plugin.changes.length}{' '}
        {plugin.changes.length === 1 ? 'change' : 'changes'} ready to publish
      </PMText>
      {plugin.changes.map((change) => (
        <ChangeRow
          key={`${change.artifactKind}-${change.target}`}
          change={change}
        />
      ))}
    </PMVStack>
  );
}

function ChangeRow({ change }: Readonly<{ change: PluginChange }>) {
  const { Icon, color, verb } = changeVisual(change.kind);
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      paddingX={3}
      paddingY={2}
    >
      <PMHStack gap={2} align="center">
        <PMIcon fontSize="sm" color={color}>
          <Icon />
        </PMIcon>
        <PMText fontSize="xs" color="faded">
          {verb}
        </PMText>
        <PMText fontSize="sm" color="primary" truncate>
          {change.target}
        </PMText>
        <PMBadge
          size="sm"
          variant="subtle"
          colorPalette="gray"
          marginLeft="auto"
        >
          {change.artifactKind}
        </PMBadge>
      </PMHStack>
    </PMBox>
  );
}

function changeVisual(kind: PluginChange['kind']) {
  switch (kind) {
    case 'added':
      return { Icon: LuPlus, color: 'green.500', verb: 'Added' };
    case 'removed':
      return { Icon: LuMinus, color: 'red.500', verb: 'Removed' };
    default:
      return { Icon: LuPencil, color: 'text.secondary', verb: 'Updated' };
  }
}
