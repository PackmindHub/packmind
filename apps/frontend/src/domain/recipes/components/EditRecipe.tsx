import React, { useState } from 'react';
import { PMBox, PMVStack, PMHStack } from '@packmind/ui';
import { PMButton, PMInput, PMTextArea, PMText } from '@packmind/ui';
import { useUpdateRecipeMutation } from '../api/queries/RecipesQueries';
import { Recipe } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { SpaceId } from '@packmind/types';

interface EditRecipeProps {
  recipe: Recipe;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  onCancel: () => void;
  onSuccess: () => void;
}

export const EditRecipe: React.FC<EditRecipeProps> = ({
  recipe,
  organizationId,
  spaceId,
  onCancel,
  onSuccess,
}) => {
  const [name, setName] = useState(recipe.name);
  const [content, setContent] = useState(recipe.content);

  const { mutate, isPending } = useUpdateRecipeMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      alert('Command name is required');
      return;
    }

    if (!content.trim()) {
      alert('Command content is required');
      return;
    }

    mutate(
      {
        organizationId,
        spaceId,
        id: recipe.id,
        updateData: {
          name: name.trim(),
          content: content.trim(),
        },
      },
      {
        onSuccess: () => {
          console.log('Command updated successfully');
          onSuccess();
        },
        onError: (error) => {
          console.error('Failed to update command:', error);
          alert('Failed to update command. Please try again.');
        },
      },
    );
  };

  const isFormValid = name.trim() && content.trim();

  return (
    <PMBox maxW="800px" mx="auto" p={6}>
      <PMText mb={6}>Edit Command</PMText>

      <form onSubmit={handleSubmit}>
        <PMVStack gap={6} align="stretch">
          <PMBox>
            <PMText mb={2}>Name *</PMText>
            <PMInput
              placeholder="Enter command name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </PMBox>

          <PMBox>
            <PMText mb={2}>Content *</PMText>
            <PMTextArea
              placeholder="Enter command content (markdown supported)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isPending}
              rows={20}
              minHeight="400px"
            />
            <PMText color="secondary" mt={1}>
              You can use markdown formatting. The content will be used to
              generate an AI summary automatically.
            </PMText>
          </PMBox>

          <PMHStack gap={3}>
            <PMButton
              type="submit"
              variant="primary"
              disabled={!isFormValid || isPending}
              loading={isPending}
            >
              Update Command
            </PMButton>
            <PMButton
              variant="secondary"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </PMButton>
          </PMHStack>
        </PMVStack>
      </form>
    </PMBox>
  );
};
