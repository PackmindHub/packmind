import { PMBox, PMButton, PMHeading, PMText, PMVStack } from '@packmind/ui';

/**
 * First run. The empty state names the unit of work rather than the feature:
 * a plugin is what a repository installs, so the first thing to make is one.
 */
export function PluginsEmptyState({
  onCreatePlugin,
}: Readonly<{ onCreatePlugin: () => void }>) {
  return (
    <PMBox padding={10}>
      <PMBox maxWidth="60ch">
        <PMHeading level="h2">No plugin yet</PMHeading>
        <PMText as="div" color="secondary" paddingTop={2}>
          A plugin is what a repository installs and what a marketplace
          publishes. Standards, commands, skills and hooks live inside one.
        </PMText>
        <PMText as="div" color="secondary" paddingTop={3}>
          Start with one plugin per concern that travels together. Most spaces
          end up with five to ten.
        </PMText>
        <PMVStack gap={2} align="start" paddingTop={5}>
          <PMButton variant="primary" size="sm" onClick={onCreatePlugin}>
            Create the first plugin
          </PMButton>
          <PMText fontSize="xs" color="faded">
            Or run{' '}
            <PMBox as="span" fontFamily="mono" color="text.secondary">
              packmind playbook add
            </PMBox>{' '}
            in a repository and Packmind creates one from what it finds.
          </PMText>
        </PMVStack>
      </PMBox>
    </PMBox>
  );
}
