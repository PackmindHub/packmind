import { NavLink, useLoaderData, useParams } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import {
  getStandardByIdOptions,
  useGetStandardByIdQuery,
} from '../../src/domain/standards/api/queries/StandardsQueries';
import { Standard, StandardId } from '@packmind/types';
import { routes } from '../../src/shared/utils/routes';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { StandardDetails } from '../../src/domain/standards/components/StandardDetails';
import { PMBox, PMPage } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { GetStandardByIdResponse } from '@packmind/types';

export async function clientLoader({
  params,
}: {
  params: { standardId: string; spaceSlug: string };
}) {
  // Get user to access organization
  const me = await queryClient.fetchQuery(getMeQueryOptions());
  if (!me.organization) {
    throw new Error('Organization not found');
  }

  // Get space to access spaceId
  const space = await queryClient.fetchQuery(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization.id),
  );
  if (!space) {
    throw new Error('Space not found');
  }

  return queryClient.fetchQuery(
    getStandardByIdOptions(
      params.standardId as StandardId,
      space.id,
      me.organization.id,
    ),
  );
}

export const handle = {
  crumb: ({
    params,
    data,
  }: {
    params: { orgSlug: string; spaceSlug: string; standardId: string };
    data: Standard;
  }) => {
    const standardId = params.standardId;
    return (
      <NavLink
        to={routes.space.toStandard(
          params.orgSlug,
          params.spaceSlug,
          standardId,
        )}
      >
        {data.name}
      </NavLink>
    );
  },
};

export default function StandardDetailRouteModule() {
  const loaderStandard = useLoaderData() as GetStandardByIdResponse | undefined;
  const { standardId: routeStandardId } = useParams<{ standardId: string }>();
  const { organization } = useAuthContext();

  const standardId =
    (routeStandardId as StandardId | undefined) ??
    loaderStandard?.standard?.id ??
    ('' as StandardId);

  const { data: standardFromQuery } = useGetStandardByIdQuery(standardId);

  const standard = standardFromQuery ?? loaderStandard;

  if (!organization) {
    return null;
  }

  if (!standard || !standard.standard) {
    return (
      <PMPage
        title="Standard Not Found"
        subtitle="No standard ID provided"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <p>
            The standard you&apos;re looking for doesn&apos;t exist or the ID is
            invalid.
          </p>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <StandardDetails standard={standard.standard} orgSlug={organization.slug} />
  );
}
