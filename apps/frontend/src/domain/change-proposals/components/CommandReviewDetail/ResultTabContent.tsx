import {
  PMBox,
  PMHeading,
  PMHStack,
  PMMarkdownViewer,
  PMText,
} from '@packmind/ui';
import { useCallback, useMemo } from 'react';
import { ChangeProposalId, Recipe } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { applyRecipeProposals } from '../../utils/applyRecipeProposals';
import { stripFrontmatter } from '../../utils/stripFrontmatter';
import { PREVIEW_RECIPE_VERSION_ID } from '../../utils/changeProposalHelpers';
import { DownloadAsAgentButton } from '../shared/DownloadAsAgentButton';

interface ResultTabContentProps {
  recipe: Recipe;
  proposals: ChangeProposalWithConflicts[];
  acceptedProposalIds: Set<ChangeProposalId>;
}

export function ResultTabContent({
  recipe,
  proposals,
  acceptedProposalIds,
}: Readonly<ResultTabContentProps>) {
  const applied = useMemo(
    () => applyRecipeProposals(recipe, proposals, acceptedProposalIds),
    [recipe, proposals, acceptedProposalIds],
  );

  const hasAccepted = acceptedProposalIds.size > 0;

  const getPreviewCommand = useCallback(
    () => ({
      recipeVersions: [
        {
          id: PREVIEW_RECIPE_VERSION_ID,
          recipeId: recipe.id,
          name: applied.name,
          slug: recipe.slug,
          content: applied.content,
          version: recipe.version,
          userId: recipe.userId,
        },
      ],
      standardVersions: [],
      skillVersions: [],
    }),
    [applied, recipe],
  );

  return (
    <PMBox p={6}>
      <PMHStack mb={6} justifyContent="space-between" alignItems="center">
        <PMText
          fontSize="2xs"
          fontWeight="medium"
          textTransform="uppercase"
          color="faded"
        >
          Version with accepted changes
        </PMText>
        {hasAccepted && (
          <DownloadAsAgentButton
            getPreviewCommand={getPreviewCommand}
            label="Try with agent"
          />
        )}
      </PMHStack>
      {hasAccepted ? (
        <>
          <PMHeading size="md" mb={4}>
            {applied.name}
          </PMHeading>
          <PMMarkdownViewer content={stripFrontmatter(applied.content)} />
        </>
      ) : (
        <PMBox py={12} textAlign="center">
          <PMText color="faded" fontStyle="italic">
            No accepted changes yet
          </PMText>
        </PMBox>
      )}
    </PMBox>
  );
}
