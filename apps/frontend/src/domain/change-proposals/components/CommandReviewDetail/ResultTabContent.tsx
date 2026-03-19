import { PMBox, PMText } from '@packmind/ui';
import { useCallback, useMemo } from 'react';
import { ChangeProposalId, ChangeProposalType, Recipe } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { applyRecipeProposals } from '../../utils/applyRecipeProposals';
import { PREVIEW_RECIPE_VERSION_ID } from '../../utils/changeProposalHelpers';
import { ArtifactResultFilePreview } from '../shared/ArtifactResultFilePreview';

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

  const hasAcceptedRemoval = proposals.some(
    (p) =>
      acceptedProposalIds.has(p.id) &&
      p.type === ChangeProposalType.removeCommand,
  );

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
      <PMText
        fontSize="2xs"
        fontWeight="medium"
        textTransform="uppercase"
        color="faded"
        mb={6}
      >
        Version with accepted changes
      </PMText>
      {hasAccepted ? (
        <ArtifactResultFilePreview
          fileName={`${recipe.slug}.md`}
          markdown={applied.content}
          hideActions={hasAcceptedRemoval}
          getPreviewCommand={getPreviewCommand}
        />
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
