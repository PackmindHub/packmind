import { NavLink, Outlet, useLoaderData, redirect } from 'react-router';
import { PMBox, PMHStack } from '@packmind/ui';
import { SidebarNavigation } from '../../src/domain/organizations/components/SidebarNavigation';

import type { LoaderFunctionArgs } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  try {
    const me = await queryClient.ensureQueryData(getMeQueryOptions());
    if (!me.authenticated) {
      if (params.orgSlug) {
        throw redirect(`/org/${params.orgSlug}/sign-in`);
      }
      throw redirect('/get-started');
    }
    if (me.organization?.slug && me.organization.slug !== params.orgSlug) {
      throw redirect(`/org/${me.organization.slug}`);
    }
    return { me };
  } catch {
    if (params.orgSlug) {
      throw redirect(`/org/${params.orgSlug}/sign-in`);
    }
    throw redirect('/get-started');
  }
}

export const handle = {
  crumb: ({
    params,
    data,
  }: {
    params: { orgSlug: string };
    data: { me: { organization: { name: string } } };
  }) => {
    return (
      <NavLink to={`/org/${params.orgSlug}`}>
        {data.me.organization.name}
      </NavLink>
    );
  },
};

export default function AuthenticatedLayout() {
  const { me } = useLoaderData();
  const organization = me.organization;
  return (
    <PMHStack
      h="100%"
      w="100%"
      alignItems={'stretch'}
      gap={0}
      overflow={'hidden'}
    >
      <SidebarNavigation organization={organization} />
      <PMBox flex={'1'} h="100%" overflow={'auto'}>
        <Outlet />
      </PMBox>
    </PMHStack>
  );
}
