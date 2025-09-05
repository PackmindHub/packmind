import { NavLink, Outlet } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { getStandardByIdOptions } from '../../src/domain/standards/api/queries/StandardsQueries';
import { Standard, StandardId } from '@packmind/standards';

export function clientLoader({ params }: { params: { standardId: string } }) {
  const standardData = queryClient.ensureQueryData(
    getStandardByIdOptions(params.standardId as StandardId),
  );
  return standardData;
}

export const handle = {
  crumb: ({
    params,
    data,
  }: {
    params: { orgSlug: string; standardId: string };
    data: Standard;
  }) => {
    const standardId = params.standardId;
    return (
      <NavLink to={`/org/${params.orgSlug}/standards/${standardId}`}>
        {data.name}
      </NavLink>
    );
  },
};

export default function StandardDetailRouteModule() {
  return <Outlet />;
}
