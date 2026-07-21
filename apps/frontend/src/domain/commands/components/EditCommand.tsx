import React, { useState, useMemo } from 'react';
import {
  useUpdateCommandMutation,
  useGetCommandsQuery,
} from '../api/queries/CommandsQueries';
import { Command } from '@packmind/types';
import { RECIPE_MESSAGES } from '../constants/messages';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import { CommandForm, CommandFormData } from './CommandForm';
import { MarkdownEditorProvider } from '../../../shared/components/editor/MarkdownEditor';
import { useListChangeProposalsByCommandQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import {
  countPendingChangeProposals,
  PendingChangeProposalsWarning,
  ConfirmSaveWithPendingProposalsDialog,
} from '../../../shared/components/PendingChangeProposals';

interface IEditCommandProps {
  recipe: Command;
}

export const EditCommand: React.FC<IEditCommandProps> = ({ recipe }) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const nav = useNavigation();

  const [alert, setAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] =
    useState<CommandFormData | null>(null);

  const updateMutation = useUpdateCommandMutation();
  const { data: existingCommands } = useGetCommandsQuery();
  const existingCommandNames = useMemo(
    () => (existingCommands ?? []).map((r) => r.name),
    [existingCommands],
  );

  const { data: changeProposals } = useListChangeProposalsByCommandQuery(
    recipe.id,
  );
  const pendingChangeProposalsCount =
    countPendingChangeProposals(changeProposals);

  const performUpdate = (data: CommandFormData) => {
    if (!organization?.id || !spaceId) {
      setAlert({
        type: 'error',
        message: 'Organization or space not found',
      });
      return;
    }

    updateMutation.mutate(
      {
        organizationId: organization.id,
        spaceId,
        id: recipe.id,
        updateData: {
          name: data.name,
          content: data.content,
        },
      },
      {
        onSuccess: () => {
          setAlert({
            type: 'success',
            message: RECIPE_MESSAGES.success.updated,
          });
          setTimeout(() => {
            setAlert(null);
            nav.space.toCommand(recipe.id);
          }, 1500);
        },
        onError: (error) => {
          console.error('Failed to update command:', error);
          setAlert({
            type: 'error',
            message: RECIPE_MESSAGES.error.updateFailed,
          });
        },
      },
    );
  };

  const handleSubmit = (data: CommandFormData) => {
    if (pendingChangeProposalsCount > 0) {
      setPendingSubmitData(data);
      setConfirmSaveOpen(true);
      return;
    }

    performUpdate(data);
  };

  const handleConfirmSave = () => {
    setConfirmSaveOpen(false);
    if (pendingSubmitData) {
      performUpdate(pendingSubmitData);
      setPendingSubmitData(null);
    }
  };

  const handleCancel = () => {
    nav.space.toCommand(recipe.id);
  };

  return (
    <MarkdownEditorProvider>
      <PendingChangeProposalsWarning
        count={pendingChangeProposalsCount}
        itemType="command"
      />
      <ConfirmSaveWithPendingProposalsDialog
        open={confirmSaveOpen}
        onOpenChange={({ open }) => setConfirmSaveOpen(open)}
        count={pendingChangeProposalsCount}
        itemType="command"
        onConfirm={handleConfirmSave}
      />
      <CommandForm
        mode="edit"
        recipe={recipe}
        existingCommandNames={existingCommandNames}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isPending={updateMutation.isPending}
        alert={alert}
      />
    </MarkdownEditorProvider>
  );
};
