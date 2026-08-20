import { PMButton, PMMenu, PMPortal, PMText } from '@packmind/ui';
import type { PackageId } from '@packmind/types';
import { useStandardCreationOptions } from '../../../standards/components/useStandardCreationOptions';
import { useCommandCreationOptions } from '../../../commands/components/useCommandCreationOptions';
import { useSkillCreationOptions } from '../../../skills/components/useSkillCreationOptions';
import { COMPONENT_TYPE_LABELS } from './buildPackageContext';

/**
 * Every way of adding something to a space, in one menu.
 *
 * This is what the plugin-first navigation had taken away without replacing.
 * Creating a standard or a command lived on the per-type index pages, and those
 * pages have no entry any more, so the mode could be read but not written to:
 * the routes still answered, they just had no address in the product.
 *
 * Grouped by type and flat inside each group, rather than a submenu per type.
 * The question being asked here is "how do I add one of these", and a submenu
 * hides the answer behind the type — which is the part the user already knows.
 * Seven items is the honest size of the answer.
 *
 * The skill group is the reason the grouping earns its keep. Neither of its
 * entries is a form, because a skill is a folder of files rather than a page of
 * fields; both explain a route in. Listing them next to the others says a skill
 * can be made, which omitting them would deny.
 *
 * The package travels to the two manual forms, which create one component and
 * know its id at the end, so it can join the package in the same gesture. The
 * other paths cannot: an agent writes later and an import writes many at once,
 * so what they produce lands in the space and is caught by the inventory's
 * orphan line.
 */
export function ContextCreateMenu({
  orgSlug,
  spaceSlug,
  packageId,
}: Readonly<{ orgSlug: string; spaceSlug: string; packageId: PackageId }>) {
  const standards = useStandardCreationOptions({
    orgSlug,
    spaceSlug,
    packageId,
  });
  const commands = useCommandCreationOptions({ orgSlug, spaceSlug, packageId });
  const skills = useSkillCreationOptions();

  return (
    <>
      <PMMenu.Root>
        <PMMenu.Trigger asChild>
          {/* The label the three per-type pages already use. */}
          <PMButton size="sm">Create</PMButton>
        </PMMenu.Trigger>
        <PMPortal>
          <PMMenu.Positioner>
            <PMMenu.Content minW="350px">
              <PMMenu.ItemGroup>
                <GroupLabel>{COMPONENT_TYPE_LABELS.standard}</GroupLabel>
                {standards.items}
              </PMMenu.ItemGroup>
              <PMMenu.Separator />
              <PMMenu.ItemGroup>
                <GroupLabel>{COMPONENT_TYPE_LABELS.command}</GroupLabel>
                {commands.items}
              </PMMenu.ItemGroup>
              <PMMenu.Separator />
              <PMMenu.ItemGroup>
                <GroupLabel>{COMPONENT_TYPE_LABELS.skill}</GroupLabel>
                {skills.items}
              </PMMenu.ItemGroup>
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>
      {/* Outside the menu: the content unmounts when it closes. */}
      {standards.dialogs}
      {commands.dialogs}
      {skills.dialogs}
    </>
  );
}

/**
 * The same mark as the group headings of the list below, so the menu reads as
 * the same three kinds of thing the pane is showing.
 */
function GroupLabel({ children }: Readonly<{ children: string }>) {
  return (
    <PMMenu.ItemGroupLabel>
      <PMText
        fontSize="10px"
        fontWeight="semibold"
        textTransform="uppercase"
        letterSpacing="wider"
        color="faded"
      >
        {children}
      </PMText>
    </PMMenu.ItemGroupLabel>
  );
}
