import { NavLink, Outlet, redirect } from 'react-router';
import { PMBox, PMHStack, pmToaster } from '@packmind/ui';
import { SidebarNavigation } from '../../src/domain/organizations/components/SidebarNavigation';

import type { LoaderFunctionArgs } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import {
  getMeQueryOptions,
  useGetMeQuery,
} from '../../src/domain/accounts/api/queries/UserQueries';
import { getUserOrganizationsQueryOptions } from '../../src/domain/accounts/api/queries/AccountsQueries';
import { getSelectOrganizationQueryOptions } from '../../src/domain/accounts/api/queries/AuthQueries';
import { useAuthErrorHandler } from '../../src/domain/accounts/hooks/useAuthErrorHandler';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  try {
    const me = await queryClient.ensureQueryData(getMeQueryOptions());
    if (!me.authenticated) {
      throw redirect('/sign-in');
    }
    if (me.organization?.slug && me.organization.slug !== params.orgSlug) {
      const organizations = await queryClient.ensureQueryData(
        getUserOrganizationsQueryOptions(),
      );
      const organization = organizations.find(
        (org) => org.slug === params.orgSlug,
      );
      if (organization) {
        await queryClient.ensureQueryData(
          getSelectOrganizationQueryOptions(organization.id),
        );
        await queryClient.invalidateQueries();

        return { me: await queryClient.ensureQueryData(getMeQueryOptions()) };
      } else {
        pmToaster.error({
          title: 'Access denied',
          description: `You don't have access to this organization. Redirecting to ${me.organization.name}.`,
        });
        throw redirect(`/org/${me.organization.slug}`);
      }
    }
    return { me };
  } catch {
    throw redirect('/sign-in');
  }
}

export default function AuthenticatedLayout() {
  const { data: me } = useGetMeQuery();
  useAuthErrorHandler();
  if (!me) return null;

  return (
    <PMHStack
      h="100%"
      w="100%"
      alignItems={'stretch'}
      gap={0}
      overflow={'hidden'}
    >
      <SidebarNavigation organization={me.organization} />
      <PMBox flex={'1'} h="100%" overflow={'auto'}>
        <Outlet />
      </PMBox>
    </PMHStack>
  );
}
