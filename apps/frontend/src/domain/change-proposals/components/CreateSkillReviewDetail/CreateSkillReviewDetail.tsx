import { useCallback } from 'react';
import { useParams } from 'react-router';
import { PMBox, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalId,
  OrganizationId,
  SkillCreationProposalOverview,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  useGetGroupedChangeProposalsQuery,
  useApplyCreationChangeProposalsMutation,
} from '../../api/queries/ChangeProposalsQueries';
import { routes } from '../../../../shared/utils/routes';
import { useCreationProposalCache } from '../../hooks/useCreationProposalCache';
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
  const { organization } = useAuthContext();
  const { spaceId, space } = useCurrentSpace();
  const { orgSlug: orgSlugParam } = useParams<{ orgSlug: string }>();

  const orgSlug = orgSlugProp ?? orgSlugParam;
  const spaceSlug = spaceSlugProp ?? space?.slug;

  const { data: groupedProposals, isLoading } =
    useGetGroupedChangeProposalsQuery();

  const applyMutation = useApplyCreationChangeProposalsMutation({
    orgSlug,
    spaceSlug,
  });

  const proposal = groupedProposals?.creations.find(
    (c): c is SkillCreationProposalOverview =>
      c.artefactType === 'skills' && c.proposalId === proposalId,
  );

  const { displayedProposal, submittedState, setSubmittedState } =
    useCreationProposalCache<SkillCreationProposalOverview>(proposal);

  const handleAccept = useCallback(async () => {
    if (!organization?.id || !spaceId || !orgSlug || !spaceSlug) return;
    try {
      await applyMutation.mutateAsync({
        organizationId: organization.id as OrganizationId,
        spaceId: spaceId as SpaceId,
        accepted: [proposalId as ChangeProposalId],
        rejected: [],
      });
      setSubmittedState({
        type: 'accepted',
        artefactUrl: routes.space.toSkills(orgSlug, spaceSlug),
      });
    } catch {
      // error handled by mutation onError callback
    }
  }, [
    organization?.id,
    spaceId,
    proposalId,
    orgSlug,
    spaceSlug,
    applyMutation,
    setSubmittedState,
  ]);

  const handleReject = useCallback(async () => {
    if (!organization?.id || !spaceId) return;
    try {
      await applyMutation.mutateAsync({
        organizationId: organization.id as OrganizationId,
        spaceId: spaceId as SpaceId,
        accepted: [],
        rejected: [proposalId as ChangeProposalId],
      });
      setSubmittedState({ type: 'rejected' });
    } catch {
      // error handled by mutation onError callback
    }
  }, [organization?.id, spaceId, proposalId, applyMutation, setSubmittedState]);

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
            isPending={applyMutation.isPending}
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
