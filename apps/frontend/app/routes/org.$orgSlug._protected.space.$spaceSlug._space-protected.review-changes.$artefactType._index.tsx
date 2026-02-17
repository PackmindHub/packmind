import { Navigate, useParams } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export default function ReviewChangesArtefactTypeRedirectRouteModule() {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();

  if (!orgSlug || !spaceSlug) return null;

  return (
    <Navigate to={routes.space.toReviewChanges(orgSlug, spaceSlug)} replace />
  );
}
