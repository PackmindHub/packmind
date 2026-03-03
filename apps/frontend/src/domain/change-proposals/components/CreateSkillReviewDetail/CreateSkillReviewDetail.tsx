import { PMBox, PMText, PMVStack } from '@packmind/ui';
import { SkillCreationProposalOverview } from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';
import { useCreationReviewDetail } from '../../hooks/useCreationReviewDetail';
import { SubmissionBanner } from '../SubmissionBanner';
import { ReviewActionButtons } from '../ReviewActionButtons';
import {
  ProposalDetailEmpty,
  ProposalDetailLoading,
} from '../ProposalDetailPlaceholder';

interface CreateSkillReviewDetailProps {
  proposalId: string;
  orgSlug?: string;
  spaceSlug?: string;
}

export function CreateSkillReviewDetail({
  proposalId,
  orgSlug: orgSlugProp,
  spaceSlug: spaceSlugProp,
}: Readonly<CreateSkillReviewDetailProps>) {
  const {
    displayedProposal,
    submittedState,
    handleAccept,
    handleReject,
    isPending,
    isLoading,
  } = useCreationReviewDetail<SkillCreationProposalOverview>({
    proposalId,
    orgSlugProp,
    spaceSlugProp,
    filter: (c): c is SkillCreationProposalOverview =>
      c.artefactType === 'skills',
    getAcceptUrl: (_response, orgSlug, spaceSlug) =>
      routes.space.toSkills(orgSlug, spaceSlug),
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
      <PMVStack gap={6} align="stretch" p={6}>
        {submittedState && (
          <SubmissionBanner
            submittedState={submittedState}
            artefactLabel="skill"
          />
        )}
        <PMText fontSize="lg" fontWeight="semibold">
          {displayedProposal.name}
        </PMText>
        {displayedProposal.description && (
          <PMVStack gap={1} align="stretch">
            <PMText fontSize="sm" fontWeight="semibold" color="secondary">
              Description
            </PMText>
            <PMText fontSize="sm">{displayedProposal.description}</PMText>
          </PMVStack>
        )}
        {displayedProposal.prompt && (
          <PMVStack gap={1} align="stretch">
            <PMText fontSize="sm" fontWeight="semibold" color="secondary">
              Prompt
            </PMText>
            <PMText fontSize="sm">{displayedProposal.prompt}</PMText>
          </PMVStack>
        )}
      </PMVStack>
    </PMBox>
  );
}
