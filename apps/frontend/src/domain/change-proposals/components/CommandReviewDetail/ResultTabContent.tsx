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
      <PMText
        fontSize="xs"
        fontWeight="semibold"
        textTransform="uppercase"
        color="secondary"
        mb={3}
      >
        Version with accepted changes
      </PMText>
      {hasAccepted ? (
        <>
          <PMHeading size="md" mb={4}>
            {applied.name}
          </PMHeading>
          <PMMarkdownViewer content={applied.content} />
        </>
      ) : (
        <PMText color="secondary" fontStyle="italic">
          No accepted changes yet
        </PMText>
      )}
    </PMBox>
  );
}
