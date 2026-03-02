import { useParams } from 'react-router';
import { CreateCommandReviewDetail } from '../../src/domain/change-proposals/components/CreateCommandReviewDetail';

export default function ReviewChangesCreationDetailRouteModule() {
  const { artefactType, proposalId, orgSlug, spaceSlug } = useParams<{
    artefactType: string;
    proposalId: string;
    orgSlug: string;
    spaceSlug: string;
  }>();

  if (!proposalId || artefactType !== 'commands') return null;

  return (
    <CreateCommandReviewDetail
      key={proposalId}
      proposalId={proposalId}
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
    />
  );
}
