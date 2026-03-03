import { PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import { StandardCreationProposalOverview } from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';
import { useCreationReviewDetail } from '../../hooks/useCreationReviewDetail';
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
