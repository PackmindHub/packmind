import { PMBox, PMHeading, PMMarkdownViewer, PMVStack } from '@packmind/ui';
import { useCallback, useState } from 'react';
import {
  ChangeProposalId,
  CommandCreationProposalOverview,
  RecipeId,
} from '@packmind/types';
import { PREVIEW_RECIPE_VERSION_ID } from '../../utils/changeProposalHelpers';
import { routes } from '../../../../shared/utils/routes';
import { useCreationReviewDetail } from '../../hooks/useCreationReviewDetail';
import { useUserLookup } from '../../hooks/useUserLookup';
import { stripFrontmatter } from '../../../artifacts/utils/stripFrontmatter';
import { SubmissionBanner } from '../SubmissionBanner';
import { CreationReviewHeader } from '../shared/CreationReviewHeader';
import {
  ConfirmCreationDecisionDialog,
  type CreationDecision,
} from '../shared/ConfirmCreationDecisionDialog';
import { ProposalMessage } from '../shared/ProposalMessage';
import {
  ProposalDetailEmpty,
  ProposalDetailLoading,
} from '../ProposalDetailPlaceholder';

interface CreateCommandReviewDetailProps {
  proposalId: ChangeProposalId;
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

  const [pendingDecision, setPendingDecision] =
    useState<CreationDecision | null>(null);

  const userLookup = useUserLookup();

  const getPreviewCommand = useCallback(() => {
    if (!displayedProposal) {
      return { recipeVersions: [], standardVersions: [], skillVersions: [] };
    }
    return {
      recipeVersions: [
        {
          id: PREVIEW_RECIPE_VERSION_ID,
          recipeId: 'preview' as RecipeId,
          name: displayedProposal.payload.name,
          slug: displayedProposal.payload.name
            .toLowerCase()
            .replace(/\s+/g, '-'),
          content: displayedProposal.payload.content,
          version: 1,
          userId: displayedProposal.createdBy,
        },
      ],
      standardVersions: [],
      skillVersions: [],
    };
  }, [displayedProposal]);

  const handleDialogConfirm = useCallback(async () => {
    if (!displayedProposal) return;
    if (pendingDecision === 'accept') {
      await handleAccept(displayedProposal.payload);
    } else if (pendingDecision === 'dismiss') {
      await handleReject();
    }
    setPendingDecision(null);
  }, [pendingDecision, handleAccept, handleReject, displayedProposal]);

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
        onAccept={() => setPendingDecision('accept')}
        onDismiss={() => setPendingDecision('dismiss')}
        isPending={isPending}
        isSubmitted={!!submittedState}
        getPreviewCommand={getPreviewCommand}
      />
      <ConfirmCreationDecisionDialog
        artefactLabel="command"
        open={pendingDecision !== null}
        decision={pendingDecision ?? 'accept'}
        artefactName={displayedProposal.payload.name}
        isPending={isPending}
        onConfirm={handleDialogConfirm}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setPendingDecision(null);
          }
        }}
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
          {displayedProposal.payload.name}
        </PMHeading>
        <PMMarkdownViewer
          content={stripFrontmatter(displayedProposal.payload.content)}
        />
      </PMVStack>
    </PMBox>
  );
}
