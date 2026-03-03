import { PMBox, PMHeading, PMMarkdownViewer, PMText } from '@packmind/ui';
import { useMemo } from 'react';
import { ChangeProposalId, Recipe } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { applyRecipeProposals } from '../../utils/applyRecipeProposals';

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

  return (
    <PMBox p={6}>
      <PMBox mb={6}>
        <PMText
          fontSize="2xs"
          fontWeight="medium"
          textTransform="uppercase"
          color="faded"
        >
          Version with accepted changes
        </PMText>
      </PMBox>
      {hasAccepted ? (
        <>
          <PMHeading size="md" mb={4}>
            {applied.name}
          </PMHeading>
          <PMMarkdownViewer content={applied.content} />
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
