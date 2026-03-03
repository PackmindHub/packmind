import {
  PMBox,
  PMHeading,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { useMemo } from 'react';
import { ChangeProposalId, Rule, Standard } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { applyStandardProposals } from '../../utils/applyStandardProposals';

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

  const sortedRules = useMemo(
    () =>
      [...applied.rules].sort((a, b) =>
        a.content.toLowerCase().localeCompare(b.content.toLowerCase()),
      ),
    [applied.rules],
  );

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
          <PMMarkdownViewer content={applied.description} />

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
