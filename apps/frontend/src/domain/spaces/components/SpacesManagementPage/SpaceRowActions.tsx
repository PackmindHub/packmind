import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LuEye, LuPencil, LuTrash2, LuUserPlus } from 'react-icons/lu';
import {
  PMEllipsisMenu,
  PMEllipsisMenuAction,
  PMHStack,
  PMIcon,
  PMText,
  pmToaster,
} from '@packmind/ui';
import type { Space } from '@packmind/types';

import { routes } from '../../../../shared/utils/routes';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useJoinSpaceMutation } from '../../../spaces-management/api/queries/SpacesManagementQueries';
import { DeleteSpaceConfirmDialog } from './DeleteSpaceConfirmDialog';

interface SpaceRowActionsProps {
  space: Pick<Space, 'id' | 'name' | 'slug' | 'isDefaultSpace'>;
  isMember: boolean;
  onEdit?: () => void;
}

export const SpaceRowActions: React.FC<SpaceRowActionsProps> = ({
  space,
  isMember,
  onEdit,
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const { organization } = useAuthContext();
  const queryClient = useQueryClient();
  const joinMutation = useJoinSpaceMutation();

  const handleJoin = () => {
    setIsJoining(true);
    joinMutation.mutate(
      { spaceId: space.id },
      {
        onSuccess: () => {
          if (organization?.id) {
            queryClient.invalidateQueries({
              queryKey: [
                'organizations',
                organization.id,
                'spaces',
                'management',
              ],
            });
          }
          pmToaster.create({
            type: 'success',
            title: 'Joined space',
            description: `You've joined ${space.name}.`,
          });
        },
        onError: () => {
          pmToaster.create({
            type: 'error',
            title: 'Failed to join space',
            description:
              'An error occurred while joining the space. Please try again.',
          });
        },
        onSettled: () => setIsJoining(false),
      },
    );
  };

  const menuActions: PMEllipsisMenuAction[] = [];

  if (onEdit) {
    menuActions.push({
      value: `edit-${space.id}`,
      content: (
        <PMHStack gap={2}>
          <PMIcon>
            <LuPencil />
          </PMIcon>
          <PMText color="secondary">Edit</PMText>
        </PMHStack>
      ),
      onClick: onEdit,
    });
  }

  if (isMember && space.slug && orgSlug) {
    menuActions.push({
      value: `view-${space.id}`,
      content: (
        <PMHStack gap={2}>
          <PMIcon>
            <LuEye />
          </PMIcon>
          <PMText color="secondary">View</PMText>
        </PMHStack>
      ),
      onClick: () => navigate(routes.space.toDashboard(orgSlug, space.slug!)),
    });
  }

  if (!isMember) {
    menuActions.push({
      value: `join-${space.id}`,
      content: (
        <PMHStack gap={2}>
          <PMIcon>
            <LuUserPlus />
          </PMIcon>
          <PMText color="secondary">Join</PMText>
        </PMHStack>
      ),
      onClick: handleJoin,
    });
  }

  if (!space.isDefaultSpace) {
    menuActions.push({
      value: `delete-${space.id}`,
      content: (
        <PMHStack gap={2}>
          <PMIcon>
            <LuTrash2 />
          </PMIcon>
          <PMText color="error">Delete</PMText>
        </PMHStack>
      ),
      onClick: () => setIsDeleteOpen(true),
    });
  }

  return (
    <>
      <PMHStack gap={1} justify="flex-end">
        {menuActions.length > 0 && (
          <PMEllipsisMenu actions={menuActions} disabled={isJoining} />
        )}
      </PMHStack>
      {!space.isDefaultSpace && (
        <DeleteSpaceConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          space={{ id: space.id, name: space.name }}
        />
      )}
    </>
  );
};
