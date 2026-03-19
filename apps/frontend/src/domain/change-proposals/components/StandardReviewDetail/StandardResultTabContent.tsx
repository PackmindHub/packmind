import { PMBox, PMText } from '@packmind/ui';
import { useCallback, useMemo } from 'react';
import {
  ChangeProposalId,
  ChangeProposalType,
  Rule,
  Standard,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { applyStandardProposals } from '../../utils/applyStandardProposals';
import { PREVIEW_STANDARD_VERSION_ID } from '../../utils/changeProposalHelpers';
import { serializeStandardToMarkdown } from '../../utils/serializeArtifactToMarkdown';
import { ArtifactResultFilePreview } from '../shared/ArtifactResultFilePreview';

interface StandardResultTabContentProps {
  standard: Standard;
  rules: Rule[];
  proposals: ChangeProposalWithConflicts[];
  acceptedProposalIds: Set<ChangeProposalId>;
}

export function StandardResultTabContent({
  standard,
  rules,
  proposals,
  acceptedProposalIds,
}: Readonly<StandardResultTabContentProps>) {
  const applied = useMemo(
    () =>
      applyStandardProposals(standard, rules, proposals, acceptedProposalIds),
    [standard, rules, proposals, acceptedProposalIds],
  );

  const hasAccepted = acceptedProposalIds.size > 0;

  const hasAcceptedRemoval = proposals.some(
    (p) =>
      acceptedProposalIds.has(p.id) &&
      p.type === ChangeProposalType.removeStandard,
  );

  const getPreviewCommand = useCallback(
    () => ({
      recipeVersions: [],
      standardVersions: [
        {
          id: PREVIEW_STANDARD_VERSION_ID,
          standardId: standard.id,
          name: applied.name,
          slug: standard.slug,
          description: applied.description,
          version: standard.version,
          scope: applied.scope,
          rules: applied.rules,
        },
      ],
      skillVersions: [],
    }),
    [applied, standard],
  );

  const markdown = useMemo(
    () => serializeStandardToMarkdown(applied),
    [applied],
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
          fileName={`standard-${standard.slug}.md`}
          markdown={markdown}
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
