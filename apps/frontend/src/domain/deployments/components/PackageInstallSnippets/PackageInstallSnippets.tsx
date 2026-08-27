import { PMAccordion, PMText, PMVStack } from '@packmind/ui';
import { CopiableTextField } from '../../../../shared/components/inputs/CopiableTextField';

/**
 * The commands that pull a package into a working copy.
 *
 * Shared rather than written twice: the package's page and the context pane
 * both offer the install, and the string is the one thing about a package a
 * user pastes into a terminal. Two copies of it are two chances to teach a
 * command that no longer exists.
 *
 * Fields rather than a copy button alone, because the command is also read: it
 * says which space and which package, and someone about to run it in their own
 * repository wants to see that before it lands.
 *
 * No wrapper element and no heading of its own. Both call sites already have a
 * layout and a name for this block, one as a section of a page and one as the
 * body of a popover, and a wrapper here would fight whichever gap the caller
 * set.
 */
export function PackageInstallSnippets({
  spaceSlug,
  packageSlug,
}: Readonly<{ spaceSlug: string; packageSlug: string }>) {
  const installCommand = `packmind install @${spaceSlug}/${packageSlug}`;
  const installAsClaudePluginCommand = `packmind plugins render @${spaceSlug}/${packageSlug}`;

  return (
    <>
      <CopiableTextField value={installCommand} readOnly />
      {/*
        Folded, because it is the answer to a question most readers do not have:
        the plain install serves every agent, and the plugin form is one agent's
        packaging of it.
      */}
      <PMAccordion.Root collapsible>
        <PMAccordion.Item value="more-install-options" border="none">
          <PMAccordion.ItemTrigger cursor="pointer" py={1} width="fit-content">
            <PMAccordion.ItemIndicator />
            <PMText variant="small" fontWeight="medium" color="secondary">
              More install options
            </PMText>
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent pt={3} pb={1}>
            <PMVStack align="stretch" gap={2}>
              <PMText variant="body" fontWeight="medium">
                Install as Claude plugin
              </PMText>
              <PMText variant="small" color="secondary">
                Use this package as a Claude Code plugin.
              </PMText>
              <CopiableTextField
                value={installAsClaudePluginCommand}
                readOnly
              />
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>
      </PMAccordion.Root>
    </>
  );
}
