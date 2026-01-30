import React, { useState } from 'react';
import { useCreateRecipeMutation } from '../api/queries/RecipesQueries';
import { Recipe } from '@packmind/types';
import { RECIPE_MESSAGES } from '../constants/messages';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import { CommandForm, CommandFormData } from './CommandForm';
import { MarkdownEditorProvider } from '../../../shared/components/editor/MarkdownEditor';
import { isPackmindConflictError } from '../../../services/api/errors/PackmindConflictError';

export const CreateCommand = () => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const nav = useNavigation();

  const [alert, setAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const createMutation = useCreateRecipeMutation();

  const handleSubmit = (data: CommandFormData) => {
    if (!organization?.id || !spaceId) {
      setAlert({
        type: 'error',
        message: 'Organization or space not found',
      });
      return;
    }

    createMutation.mutate(
      {
        organizationId: organization.id,
        spaceId,
        recipe: {
          name: data.name,
          content: data.content,
          slug: data.slug,
        },
      },
      {
        onSuccess: (createdRecipe: Recipe) => {
          setAlert({
            type: 'success',
            message: RECIPE_MESSAGES.success.created,
          });
          setTimeout(() => {
            setAlert(null);
            nav.space.toCommand(createdRecipe.id);
          }, 1500);
        },
        onError: (error) => {
          console.error('Failed to create command:', error);
          if (isPackmindConflictError(error)) {
            setAlert({
              type: 'error',
              message: RECIPE_MESSAGES.error.slugAlreadyExists,
            });
          } else {
            setAlert({
              type: 'error',
              message: RECIPE_MESSAGES.error.createFailed,
            });
          }
        },
      },
    );
  };

  const handleCancel = () => {
    nav.space.toCommands();
  };

  return (
    <MarkdownEditorProvider>
      <CommandForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isPending={createMutation.isPending}
        alert={alert}
      />
    </MarkdownEditorProvider>
  );
};
