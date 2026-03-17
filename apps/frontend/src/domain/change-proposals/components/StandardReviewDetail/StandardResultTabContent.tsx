import {
  PMBox,
  PMHeading,
  PMHStack,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { useCallback, useMemo } from 'react';
import { ChangeProposalId, Rule, Standard } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { applyStandardProposals } from '../../utils/applyStandardProposals';
import { PREVIEW_STANDARD_VERSION_ID } from '../../utils/changeProposalHelpers';
import { DownloadAsAgentButton } from '../shared/DownloadAsAgentButton';

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

  const sortedRules = useMemo(
    () =>
      [...applied.rules].sort((a, b) =>
        a.content.toLowerCase().localeCompare(b.content.toLowerCase()),
      ),
    [applied.rules],
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
          <PMMarkdownViewer content={applied.description} />

          {applied.scope && (
            <PMBox mt={4}>
              <PMText as="p" fontSize="sm" fontWeight="semibold" mb={1}>
                Scope
              </PMText>
              <PMText fontSize="sm" color="faded">
                {applied.scope}
              </PMText>
            </PMBox>
          )}

          {sortedRules.length > 0 && (
            <PMVStack gap={2} align="stretch" marginTop={6}>
              <PMText fontSize="md" fontWeight="semibold">
                Rules
              </PMText>
              {sortedRules.map((rule) => (
                <PMBox key={rule.id} p={3} bg="background.tertiary">
                  <PMText fontSize="sm" color="primary">
                    {rule.content}
                  </PMText>
                </PMBox>
              ))}
            </PMVStack>
          )}
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
