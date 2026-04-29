import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { LuEye, LuTrash2 } from 'react-icons/lu';
import {
  PMEllipsisMenu,
  PMEllipsisMenuAction,
  PMHStack,
  PMIcon,
  PMText,
} from '@packmind/ui';
import type { Space } from '@packmind/types';

import { routes } from '../../../../shared/utils/routes';
import { DeleteSpaceConfirmDialog } from './DeleteSpaceConfirmDialog';

interface SpaceRowActionsProps {
  space: Pick<Space, 'id' | 'name' | 'slug' | 'isDefaultSpace'>;
}

export const SpaceRowActions: React.FC<SpaceRowActionsProps> = ({ space }) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug?: string }>();

  const showView = Boolean(space.slug && orgSlug);
  const showDelete = !space.isDefaultSpace;

  const actions: PMEllipsisMenuAction[] = [];

  if (showView) {
    actions.push({
      value: `view-${space.id}`,
      content: (
        <PMHStack gap={2}>
          <PMIcon>
            <LuEye />
          </PMIcon>
          <PMText color="secondary">View</PMText>
        </PMHStack>
      ),
      onClick: () => {
        if (orgSlug && space.slug) {
          navigate(routes.space.toDashboard(orgSlug, space.slug));
        }
      },
    });
  }

  if (showDelete) {
    actions.push({
      value: `delete-${space.id}`,
      content: (
        <PMHStack gap={2}>
          <PMIcon>
            <LuTrash2 />
          </PMIcon>
          <PMText color="error">Delete</PMText>
        </PMHStack>
      ),
      onClick: () => setIsConfirmOpen(true),
    });
  }

  return (
    <>
      <PMEllipsisMenu actions={actions} />
      {showDelete && (
        <DeleteSpaceConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          space={{ id: space.id, name: space.name }}
        />
      )}
    </>
  );
};
