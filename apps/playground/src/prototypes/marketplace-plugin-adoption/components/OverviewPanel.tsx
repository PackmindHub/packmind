import { PMBadge, PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import type { Plugin } from '../types';

// Kept deliberately plain: this prototype is about the Adoption surface, and
// Overview only needs to exist so the tab strip can be judged in context.

export function OverviewPanel({ plugin }: Readonly<{ plugin: Plugin }>) {
  return (
    <PMVStack gap={3} align="stretch" paddingTop={4}>
      <PMText fontSize="sm" color="secondary">
        {plugin.artifacts.length} bundled{' '}
        {plugin.artifacts.length === 1 ? 'artifact' : 'artifacts'} published
        from the {plugin.spaceName} space.
      </PMText>
      {plugin.artifacts.map((artifact) => (
        <PMBox
          key={artifact.name}
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="sm"
          paddingX={3}
          paddingY={2.5}
        >
          <PMVStack gap={1} align="start">
            <PMHStack gap={2} align="center">
              <PMBadge size="sm" variant="subtle" colorPalette="gray">
                {artifact.kind}
              </PMBadge>
              <PMText fontSize="sm" color="primary" fontWeight="medium">
                {artifact.name}
              </PMText>
            </PMHStack>
            <PMText fontSize="xs" color="faded">
              {artifact.summary}
            </PMText>
          </PMVStack>
        </PMBox>
      ))}
    </PMVStack>
  );
}
