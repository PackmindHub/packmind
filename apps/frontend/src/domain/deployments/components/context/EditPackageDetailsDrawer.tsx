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
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import type { OrganizationId, PackageResponse, SpaceId } from '@packmind/types';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { useUpdatePackageMutation } from '../../api/queries/DeploymentsQueries';

/**
 * The name and the description of a package, changed where the package is being
 * read.
 *
 * A drawer and not a page, unlike the edit form this takes half of. Renaming a
 * package is a correction, not a session: the answer is two fields long, the
 * user is already looking at the thing being named, and sending them to a page
 * of their own costs them the screen they were working on and then has to find
 * its way back. That return is what P0 had to build for the page; this makes it
 * unnecessary rather than shorter.
 *
 * A drawer and not a dialog because that is the shape this app gives to editing
 * something in place: spaces, versions, programs and proposals all open from the
 * side. A dialog is for a question with an answer, a drawer is for a panel of
 * fields, and it leaves the surface it was opened from on screen beside it.
 *
 * Only the two identity fields. The edit form's other half is membership, which
 * is a different question with a different shape - a list of everything in the
 * space - and it stays on its page until the pane can add components itself.
 *
 * The membership is sent back unchanged all the same, because the endpoint takes
 * the whole package: leaving the three lists out would empty it. They come from
 * the package this drawer was opened on, so the request says "these fields
 * changed, the rest is what you already have".
 */
export function EditPackageDetailsDrawer({
  pkg,
  spaceId,
  organizationId,
  open,
  onOpenChange,
}: Readonly<{
  pkg: PackageResponse;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const [name, setName] = useState(pkg.name);
  const [description, setDescription] = useState(pkg.description ?? '');
  const updatePackage = useUpdatePackageMutation();

  const isPending = updatePackage.isPending;
  const canSave = name.trim().length > 0 && !isPending;

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    onOpenChange(next);
  };

  const handleSave = async () => {
    if (!canSave) return;

    try {
      await updatePackage.mutateAsync({
        packageId: pkg.id,
        spaceId,
        organizationId,
        name: name.trim(),
        description,
        recipeIds: pkg.commands ?? [],
        standardIds: pkg.standards ?? [],
        skillsIds: pkg.skills ?? [],
      });
      pmToaster.create({
        type: 'success',
        title: `Updated ${name.trim()}`,
      });
      onOpenChange(false);
    } catch {
      pmToaster.create({
        type: 'error',
        title: `Couldn't update ${pkg.name}`,
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
              <PMHeading size="md">Edit package details</PMHeading>
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
                    />
                  </PMField.Root>

                  <PMField.Root maxW="100%">
                    <PMField.Label>Description</PMField.Label>
                    {/*
                      The same editor the edit form uses, in a box that states
                      its width as the form does: the editor does not claim the
                      space it is given, and a panel is wide enough for it to be
                      worth giving.
                    */}
                    <PMBox width="100%">
                      <MarkdownEditor
                        defaultValue={description}
                        onMarkdownChange={setDescription}
                      />
                    </PMBox>
                  </PMField.Root>
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
                disabled={!canSave}
                loading={isPending}
                onClick={() => void handleSave()}
              >
                Save
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
