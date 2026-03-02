import { useParams } from 'react-router';
import { CreateCommandReviewDetail } from '../../src/domain/change-proposals/components/CreateCommandReviewDetail';
import { CreateStandardReviewDetail } from '../../src/domain/change-proposals/components/CreateStandardReviewDetail';

export default function ReviewChangesCreationDetailRouteModule() {
  const { artefactType, proposalId, orgSlug, spaceSlug } = useParams<{
    artefactType: string;
    proposalId: string;
    orgSlug: string;
    spaceSlug: string;
  }>();

  if (!proposalId) return null;

  if (artefactType === 'commands') {
    return (
      <CreateCommandReviewDetail
        key={proposalId}
        proposalId={proposalId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    );
  }

  if (artefactType === 'standards') {
    return (
      <CreateStandardReviewDetail
        key={proposalId}
        proposalId={proposalId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    );
  }

  return null;
}
