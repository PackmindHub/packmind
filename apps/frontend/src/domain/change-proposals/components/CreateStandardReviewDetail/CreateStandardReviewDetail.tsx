import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
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
  const navigate = useNavigate();

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

  const handleAccept = useCallback(async () => {
    if (!organization?.id || !spaceId) return;

    const response = await applyMutation.mutateAsync({
      organizationId: organization.id as OrganizationId,
      spaceId: spaceId as SpaceId,
      accepted: [proposalId as ChangeProposalId],
      rejected: [],
    });

    if (orgSlug && spaceSlug) {
      const createdStandardId = response.created.standards[0];
      if (createdStandardId) {
        navigate(
          routes.space.toStandard(orgSlug, spaceSlug, createdStandardId),
        );
      } else {
        navigate(routes.space.toReviewChanges(orgSlug, spaceSlug));
      }
    }
  }, [
    organization?.id,
    spaceId,
    proposalId,
    orgSlug,
    spaceSlug,
    applyMutation,
    navigate,
  ]);

  const handleReject = useCallback(async () => {
    if (!organization?.id || !spaceId) return;

    await applyMutation.mutateAsync({
      organizationId: organization.id as OrganizationId,
      spaceId: spaceId as SpaceId,
      accepted: [],
      rejected: [proposalId as ChangeProposalId],
    });

    if (orgSlug && spaceSlug) {
      navigate(routes.space.toReviewChanges(orgSlug, spaceSlug));
    }
  }, [
    organization?.id,
    spaceId,
    proposalId,
    orgSlug,
    spaceSlug,
    applyMutation,
    navigate,
  ]);

  if (isLoading) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="300px"
        gridColumn="span 2"
      >
        <PMSpinner />
      </PMBox>
    );
  }

  if (!proposal) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="300px"
        gridColumn="span 2"
      >
        <PMText color="secondary">
          This proposal has already been processed or does not exist.
        </PMText>
      </PMBox>
    );
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
        <PMHStack gap={2}>
          <PMButton
            size="sm"
            colorPalette="red"
            variant="outline"
            disabled={applyMutation.isPending}
            onClick={handleReject}
          >
            Reject
          </PMButton>
          <PMButton
            size="sm"
            colorPalette="green"
            disabled={applyMutation.isPending}
            onClick={handleAccept}
          >
            {applyMutation.isPending ? 'Applying...' : 'Accept'}
          </PMButton>
        </PMHStack>
      </PMBox>
      <PMVStack gap={6} align="stretch" p={6}>
        <PMText fontSize="lg" fontWeight="semibold">
          {proposal.name}
        </PMText>
        {proposal.scope && (
          <PMVStack gap={1} align="stretch">
            <PMText fontSize="sm" fontWeight="semibold" color="secondary">
              Scope
            </PMText>
            <PMText fontSize="sm">{proposal.scope}</PMText>
          </PMVStack>
        )}
        {proposal.description && (
          <PMVStack gap={1} align="stretch">
            <PMText fontSize="sm" fontWeight="semibold" color="secondary">
              Description
            </PMText>
            <PMText fontSize="sm">{proposal.description}</PMText>
          </PMVStack>
        )}
        {proposal.rules.length > 0 && (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="sm" fontWeight="semibold" color="secondary">
              Rules
            </PMText>
            <PMVStack gap={2} align="stretch">
              {proposal.rules.map((rule, index) => (
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
