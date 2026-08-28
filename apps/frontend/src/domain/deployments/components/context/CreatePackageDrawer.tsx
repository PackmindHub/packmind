import { useState } from 'react';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMField,
  PMHeading,
  PMInput,
  PMPortal,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import type { OrganizationId, PackageId, SpaceId } from '@packmind/types';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { useCreatePackageMutation } from '../../api/queries/DeploymentsQueries';

/**
 * A new package, named where the space is being read.
 *
 * A drawer and not a page, for the reason the edit drawer beside this one gives:
 * the answer is two fields long, and a page costs the reader the screen they
 * were on and then has to find its way back. Here it costs them more than that.
 * A package is created in the middle of something - a component with nowhere to
 * go, a space with nothing in it yet - and the page dropped whatever that was.
 *
 * Identity only, which is what makes the drawer honest rather than a shortened
 * form. The create page asks for the membership too, three comboboxes over
 * everything the space owns, because the page was the only way to fill a
 * package: there was nowhere else to add a component to one. The pane now adds
 * components itself, from a picker that shows what the package already holds, so
 * asking here would be asking the same question twice and answering it worse.
 *
 * Mounted by its caller only while it is open, so the fields start empty every
 * time: a name typed and abandoned is not a draft worth keeping.
 */
export function CreatePackageDrawer({
  spaceId,
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: Readonly<{
  spaceId: SpaceId;
  organizationId: OrganizationId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The package exists now, and this is what opens it.
   *
   * The caller's job and not this drawer's: it holds the address, and a package
   * created and then left for the reader to find is a package they cannot find.
   * The rail sorts alphabetically, so a new one lands wherever its name puts it.
   */
  onCreated: (packageId: PackageId) => void;
}>) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createPackage = useCreatePackageMutation();

  const isPending = createPackage.isPending;
  const canCreate = name.trim().length > 0 && !isPending;

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    onOpenChange(next);
  };

  const handleCreate = async () => {
    if (!canCreate) return;

    const trimmed = name.trim();

    try {
      const created = await createPackage.mutateAsync({
        spaceId,
        organizationId,
        name: trimmed,
        description,
        recipeIds: [],
        standardIds: [],
        skillIds: [],
      });
      pmToaster.create({
        type: 'success',
        title: `Created ${trimmed}`,
      });
      onOpenChange(false);
      onCreated(created.package.id);
    } catch {
      pmToaster.create({
        type: 'error',
        title: `Couldn't create ${trimmed}`,
        description: 'Try again, or check your space access.',
      });
    }
  };

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(details) => handleOpenChange(details.open)}
      closeOnInteractOutside={!isPending}
      placement="end"
      size="lg"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMHeading size="md">New package</PMHeading>
            </PMDrawer.Header>

            <PMDrawer.Body padding={5}>
              <MarkdownEditorProvider>
                <PMVStack gap={5} alignItems="stretch">
                  <PMField.Root required>
                    <PMField.Label>
                      Name
                      <PMField.RequiredIndicator />
                    </PMField.Label>
                    <PMInput
                      placeholder="Enter package name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      disabled={isPending}
                      autoFocus
                    />
                  </PMField.Root>

                  <PMField.Root maxW="100%">
                    <PMField.Label>Description</PMField.Label>
                    <PMBox width="100%">
                      <MarkdownEditor
                        defaultValue={description}
                        onMarkdownChange={setDescription}
                      />
                    </PMBox>
                  </PMField.Root>

                  {/*
                    Said here rather than left to be discovered on an empty
                    package: the fields stop at the name, and a reader who came
                    to build a package needs to know that the next step exists
                    and where it is.
                  */}
                  <PMText variant="small" color="secondary">
                    The package starts empty. Add standards, commands and skills
                    to it from the package itself.
                  </PMText>
                </PMVStack>
              </MarkdownEditorProvider>
            </PMDrawer.Body>

            <PMDrawer.Footer>
              <PMButton
                variant="tertiary"
                size="sm"
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </PMButton>
              <PMButton
                variant="primary"
                size="sm"
                disabled={!canCreate}
                loading={isPending}
                onClick={() => void handleCreate()}
              >
                Create
              </PMButton>
            </PMDrawer.Footer>

            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" disabled={isPending} />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}
