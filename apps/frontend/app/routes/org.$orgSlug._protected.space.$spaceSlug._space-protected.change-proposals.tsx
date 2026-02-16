import { NavLink } from 'react-router';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { routes } from '../../src/shared/utils/routes';
import { ChangeProposals } from '../../src/domain/change-proposals/components/ChangeProposals';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink
        to={routes.space.toChangeProposals(params.orgSlug, params.spaceSlug)}
      >
        Changes to review
      </NavLink>
    );
  },
};

export default function ChangeProposalsReviewRouteModule() {
  return <ChangeProposals />;
}
