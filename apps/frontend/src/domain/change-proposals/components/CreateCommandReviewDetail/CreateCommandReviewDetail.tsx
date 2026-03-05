import { PMBox, PMHeading, PMMarkdownViewer, PMVStack } from '@packmind/ui';
import { CommandCreationProposalOverview } from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';
import { useCreationReviewDetail } from '../../hooks/useCreationReviewDetail';
import { useUserLookup } from '../../hooks/useUserLookup';
import { stripFrontmatter } from '../../utils/stripFrontmatter';
import { SubmissionBanner } from '../SubmissionBanner';
import { CreationReviewHeader } from '../shared/CreationReviewHeader';
import { ProposalMessage } from '../shared/ProposalMessage';
import {
  ProposalDetailEmpty,
  ProposalDetailLoading,
} from '../ProposalDetailPlaceholder';

interface CreateCommandReviewDetailProps {
  proposalId: string;
  orgSlug?: string;
  spaceSlug?: string;
}

export function CreateCommandReviewDetail({
  proposalId,
  orgSlug: orgSlugProp,
  spaceSlug: spaceSlugProp,
}: Readonly<CreateCommandReviewDetailProps>) {
  const {
    displayedProposal,
    submittedState,
    handleAccept,
    handleReject,
    isPending,
    isLoading,
  } = useCreationReviewDetail<CommandCreationProposalOverview>({
    proposalId,
    orgSlugProp,
    spaceSlugProp,
    filter: (c): c is CommandCreationProposalOverview =>
      c.artefactType === 'commands',
    getAcceptUrl: (response, orgSlug, spaceSlug) => {
      const createdCommandId = response.created.commands[0];
      return createdCommandId
        ? routes.space.toCommand(orgSlug, spaceSlug, createdCommandId)
        : routes.space.toCommands(orgSlug, spaceSlug);
    },
  });

  const userLookup = useUserLookup();

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
      <PMVStack gap={2} align="stretch" p={6}>
        {submittedState && (
          <SubmissionBanner
            submittedState={submittedState}
            artefactLabel="command"
          />
        )}
        <PMHeading size="md" mb={4}>
          {displayedProposal.name}
        </PMHeading>
        <PMMarkdownViewer
          content={stripFrontmatter(displayedProposal.content)}
        />
      </PMVStack>
    </PMBox>
  );
}
