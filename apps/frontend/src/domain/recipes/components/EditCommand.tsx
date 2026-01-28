import React, { useState } from 'react';
import { useUpdateRecipeMutation } from '../api/queries/RecipesQueries';
import { Recipe } from '@packmind/types';
import { RECIPE_MESSAGES } from '../constants/messages';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import { CommandForm, CommandFormData } from './CommandForm';
import { MarkdownEditorProvider } from '../../../shared/components/editor/MarkdownEditor';

interface IEditCommandProps {
  recipe: Recipe;
}

export const EditCommand: React.FC<IEditCommandProps> = ({ recipe }) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const nav = useNavigation();

  const [alert, setAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const updateMutation = useUpdateRecipeMutation();

  const handleSubmit = (data: CommandFormData) => {
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

  const handleCancel = () => {
    nav.space.toCommand(recipe.id);
  };

  return (
    <MarkdownEditorProvider>
      <CommandForm
        mode="edit"
        recipe={recipe}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isPending={updateMutation.isPending}
        alert={alert}
      />
    </MarkdownEditorProvider>
  );
};
