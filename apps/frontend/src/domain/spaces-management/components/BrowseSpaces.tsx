import React from 'react';
import { PMIconButton } from '@packmind/ui';
import { LuPlus } from 'react-icons/lu';
import { CreateSpaceDialog } from './CreateSpaceDialog';

export function BrowseSpaces(): React.ReactElement {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  return (
    <>
      <PMIconButton
        aria-label="Create space"
        size="2xs"
        variant="ghost"
        onClick={() => setIsCreateDialogOpen(true)}
      >
        <LuPlus />
      </PMIconButton>
      <CreateSpaceDialog
        open={isCreateDialogOpen}
        setOpen={setIsCreateDialogOpen}
      />
    </>
  );
}
