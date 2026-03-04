import { PMBox, PMText, PMVStack } from '@packmind/ui';
import { CommandCreationProposalOverview } from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { useCreationReviewDetail } from '../../hooks/useCreationReviewDetail';
import { stripFrontmatter } from '../../utils/stripFrontmatter';
import { SubmissionBanner } from '../SubmissionBanner';
import { ReviewActionButtons } from '../ReviewActionButtons';
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

  if (isLoading && !displayedProposal) {
    return <ProposalDetailLoading />;
  }

  if (!displayedProposal) {
    return <ProposalDetailEmpty />;
  }

  return (
    <PMBox gridColumn="span 2" overflowY="auto">
      <PMBox
        borderBottomWidth="1px"
        paddingX={6}
        paddingY={2}
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
        gap={4}
        minH="44px"
      >
        {!submittedState && (
          <ReviewActionButtons
            onAccept={handleAccept}
            onReject={handleReject}
            isPending={isPending}
          />
        )}
      </PMBox>
      <PMVStack gap={2} align="stretch" p={6}>
        {submittedState && (
          <SubmissionBanner
            submittedState={submittedState}
            artefactLabel="command"
          />
        )}
        <PMText fontSize="lg" fontWeight="semibold">
          {displayedProposal.name}
        </PMText>
        <MarkdownEditorProvider>
          <MarkdownEditor
            defaultValue={stripFrontmatter(displayedProposal.content)}
            readOnly
            paddingVariant="none"
          />
        </MarkdownEditorProvider>
      </PMVStack>
    </PMBox>
  );
}
