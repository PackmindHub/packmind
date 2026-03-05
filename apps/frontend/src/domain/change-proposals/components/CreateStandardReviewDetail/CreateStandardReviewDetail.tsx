import {
  PMBox,
  PMHeading,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { useMemo } from 'react';
import { StandardCreationProposalOverview } from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';
import { useCreationReviewDetail } from '../../hooks/useCreationReviewDetail';
import { useUserLookup } from '../../hooks/useUserLookup';
import { SubmissionBanner } from '../SubmissionBanner';
import { CreationReviewHeader } from '../shared/CreationReviewHeader';
import { ProposalMessage } from '../shared/ProposalMessage';
import {
  ProposalDetailEmpty,
  ProposalDetailLoading,
} from '../ProposalDetailPlaceholder';

interface CreateStandardReviewDetailProps {
  proposalId: string;
  orgSlug?: string;
  spaceSlug?: string;
}

export function CreateStandardReviewDetail({
  proposalId,
  orgSlug: orgSlugProp,
  spaceSlug: spaceSlugProp,
}: Readonly<CreateStandardReviewDetailProps>) {
  const {
    displayedProposal,
    submittedState,
    handleAccept,
    handleReject,
    isPending,
    isLoading,
  } = useCreationReviewDetail<StandardCreationProposalOverview>({
    proposalId,
    orgSlugProp,
    spaceSlugProp,
    filter: (c): c is StandardCreationProposalOverview =>
      c.artefactType === 'standards',
    getAcceptUrl: (response, orgSlug, spaceSlug) => {
      const createdStandardId = response.created.standards[0];
      return createdStandardId
        ? routes.space.toStandard(orgSlug, spaceSlug, createdStandardId)
        : routes.space.toStandards(orgSlug, spaceSlug);
    },
  });

  const userLookup = useUserLookup();

  const sortedRules = useMemo(
    () =>
      displayedProposal
        ? [...displayedProposal.rules].sort((a, b) =>
            a.content.toLowerCase().localeCompare(b.content.toLowerCase()),
          )
        : [],
    [displayedProposal],
  );

  if (isLoading && !displayedProposal) {
    return <ProposalDetailLoading />;
  }

  if (!displayedProposal) {
    return <ProposalDetailEmpty />;
  }

  const authorName =
    userLookup.get(displayedProposal.createdBy) ?? 'Unknown user';

  return (
    <PMBox gridColumn="span 2" overflowY="auto">
      <CreationReviewHeader
        artefactName={displayedProposal.name}
        latestAuthor={authorName}
        latestTime={new Date(displayedProposal.lastContributedAt)}
        onAccept={handleAccept}
        onDismiss={handleReject}
        isPending={isPending}
        isSubmitted={!!submittedState}
      />
      <PMBox
        px={6}
        py={2}
        border="sm"
        borderTop="none"
        borderColor="border.tertiary"
      >
        <ProposalMessage message={displayedProposal.message} />
      </PMBox>
      <PMVStack gap={6} align="stretch" p={6}>
        {submittedState && (
          <SubmissionBanner
            submittedState={submittedState}
            artefactLabel="standard"
          />
        )}
        <PMHeading size="md" mb={4}>
          {displayedProposal.name}
        </PMHeading>
        <PMMarkdownViewer content={displayedProposal.description} />

        {displayedProposal.scope && (
          <PMBox mt={4}>
            <PMText as="p" fontSize="sm" fontWeight="semibold" mb={1}>
              Scope
            </PMText>
            <PMText fontSize="sm" color="faded">
              {displayedProposal.scope}
            </PMText>
          </PMBox>
        )}

        {sortedRules.length > 0 && (
          <PMVStack gap={2} align="stretch" marginTop={6}>
            <PMText fontSize="md" fontWeight="semibold">
              Rules
            </PMText>
            {sortedRules.map((rule, index) => (
              <PMBox key={index} p={3} bg="background.tertiary">
                <PMText fontSize="sm" color="primary">
                  {rule.content}
                </PMText>
              </PMBox>
            ))}
          </PMVStack>
        )}
      </PMVStack>
    </PMBox>
  );
}
