import React from 'react';
import { LuEye, LuPencil, LuTrash2 } from 'react-icons/lu';
import {
  PMEllipsisMenu,
  PMEllipsisMenuProps,
  PMHStack,
  PMIcon,
  PMText,
} from '@packmind/ui';

interface SpaceRowActionsProps {
  spaceId: string;
}

export const SpaceRowActions: React.FC<SpaceRowActionsProps> = ({
  spaceId,
}) => {
  const menu: PMEllipsisMenuProps = {
    actions: [
      {
        value: `view-${spaceId}`,
        content: (
          <PMHStack gap={2}>
            <PMIcon>
              <LuEye />
            </PMIcon>
            <PMText color="secondary">View</PMText>
          </PMHStack>
        ),
        onClick: () => undefined,
      },
      {
        value: `edit-${spaceId}`,
        content: (
          <PMHStack gap={2}>
            <PMIcon>
              <LuPencil />
            </PMIcon>
            <PMText color="secondary">Edit</PMText>
          </PMHStack>
        ),
        onClick: () => undefined,
      },
      {
        value: `delete-${spaceId}`,
        content: (
          <PMHStack gap={2}>
            <PMIcon>
              <LuTrash2 />
            </PMIcon>
            <PMText color="error">Delete</PMText>
          </PMHStack>
        ),
        onClick: () => undefined,
      },
    ],
  };

  return <PMEllipsisMenu {...menu} />;
};
