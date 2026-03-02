import { useCallback } from 'react';
import { useParams } from 'react-router';
import { PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalId,
  OrganizationId,
  SpaceId,
  StandardCreationProposalOverview,
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
    (c): c is StandardCreationProposalOverview =>
      c.artefactType === 'standards' && c.proposalId === proposalId,
  );

  const { displayedProposal, submittedState, setSubmittedState } =
    useCreationProposalCache<StandardCreationProposalOverview>(proposal);

  const handleAccept = useCallback(async () => {
    if (!organization?.id || !spaceId || !orgSlug || !spaceSlug) return;
    try {
      const response = await applyMutation.mutateAsync({
        organizationId: organization.id as OrganizationId,
        spaceId: spaceId as SpaceId,
        accepted: [proposalId as ChangeProposalId],
        rejected: [],
      });
      const createdStandardId = response.created.standards[0];
      setSubmittedState({
        type: 'accepted',
        artefactUrl: createdStandardId
          ? routes.space.toStandard(orgSlug, spaceSlug, createdStandardId)
          : routes.space.toStandards(orgSlug, spaceSlug),
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
            artefactLabel="standard"
          />
        )}
        <PMText fontSize="lg" fontWeight="semibold">
          {displayedProposal.name}
        </PMText>
        {displayedProposal.scope && (
          <PMVStack gap={1} align="stretch">
            <PMText fontSize="sm" fontWeight="semibold" color="secondary">
              Scope
            </PMText>
            <PMText fontSize="sm">{displayedProposal.scope}</PMText>
          </PMVStack>
        )}
        {displayedProposal.description && (
          <PMVStack gap={1} align="stretch">
            <PMText fontSize="sm" fontWeight="semibold" color="secondary">
              Description
            </PMText>
            <PMText fontSize="sm">{displayedProposal.description}</PMText>
          </PMVStack>
        )}
        {displayedProposal.rules.length > 0 && (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="sm" fontWeight="semibold" color="secondary">
              Rules
            </PMText>
            <PMVStack gap={2} align="stretch">
              {displayedProposal.rules.map((rule, index) => (
                <PMHStack key={index} gap={2} align="flex-start">
                  <PMText fontSize="sm" color="secondary" flexShrink={0}>
                    {index + 1}.
                  </PMText>
                  <PMText fontSize="sm">{rule.content}</PMText>
                </PMHStack>
              ))}
            </PMVStack>
          </PMVStack>
        )}
      </PMVStack>
    </PMBox>
  );
}
