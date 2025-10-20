import { useParams, Outlet, NavLink } from 'react-router';
import { PMTwoColumnsLayout } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { RulesPagesSidebar } from '../../src/domain/standards/components/RulesPagesSidebar';
import { queryClient } from '../../src/shared/data/queryClient';
import {
  useGetRulesByStandardIdQuery,
  useGetStandardByIdQuery,
} from '../../src/domain/standards/api/queries/StandardsQueries';
import { StandardId } from '@packmind/standards/types';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { getRulesByStandardIdOptions } from '../../src/domain/standards/api/queries/StandardsQueries';
import { routes } from '../../src/shared/utils/routes';

export function clientLoader({ params }: { params: { standardId: string } }) {
  const rulesData = queryClient.ensureQueryData(
    getRulesByStandardIdOptions(params.standardId as StandardId),
  );

  return rulesData;
}

export const handle = {
  crumb: ({
    params,
  }: {
    params: { orgSlug: string; spaceSlug: string; standardId: string };
  }) => {
    return (
      <NavLink
        to={routes.space.toStandardRules(
          params.orgSlug,
          params.spaceSlug,
          params.standardId,
        )}
      >
        Rules
      </NavLink>
    );
  },
};

export default function StandardRulesIndexRouteModule() {
  const { standardId: paramId } = useParams() as { standardId?: string };
  const idForHook = (paramId as StandardId) || ('' as StandardId);
  const {
    data: rulesData,
    isLoading,
    isError,
  } = useGetRulesByStandardIdQuery(idForHook);

  const { data: standard } = useGetStandardByIdQuery(idForHook);

  const { organization } = useAuthContext();
  if (!organization) return null;

  return (
    <PMTwoColumnsLayout
      breadcrumbComponent={<AutobreadCrumb />}
      leftColumn={
        <RulesPagesSidebar
          standard={standard}
          rulesData={rulesData}
          isLoading={isLoading}
          isError={isError}
        />
      }
      rightColumn={<Outlet />}
    />
  );
}
