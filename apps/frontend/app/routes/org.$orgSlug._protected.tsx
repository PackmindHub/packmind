import { Outlet, redirect } from 'react-router';
import { useEffect } from 'react';
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
import { isPackmindError } from '../../src/services/api/errors/PackmindError';
import {
  initCrisp,
  setCrispUserInfo,
} from '@packmind/proprietary/frontend/services/vendors/CrispService';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  try {
    const me = await queryClient.fetchQuery(getMeQueryOptions());
    if (!me.authenticated) {
      throw redirect('/sign-in');
    }
    if (me.organization?.slug && me.organization.slug !== params.orgSlug) {
      const organizations = await queryClient.fetchQuery(
        getUserOrganizationsQueryOptions(),
      );
      const organization = organizations.find(
        (org) => org.slug === params.orgSlug,
      );
      if (organization) {
        await queryClient.fetchQuery(
          getSelectOrganizationQueryOptions(organization.id),
        );
        await queryClient.invalidateQueries();

        return { me: await queryClient.fetchQuery(getMeQueryOptions()) };
      } else {
        pmToaster.error({
          title: 'Access denied',
          description: `You don't have access to this organization. Redirecting to ${me.organization.name}.`,
        });
        throw redirect(`/org/${me.organization.slug}`);
      }
    }
    return { me };
  } catch (error) {
    // Handle PackmindError with specific status codes
    if (isPackmindError(error)) {
      const status = error.serverError.status;

      // 401 Unauthorized - redirect to sign-in
      if (status === 401) {
        throw redirect('/sign-in');
      }

      // 403 Forbidden - throw to ErrorBoundary with descriptive message
      if (status === 403) {
        throw new Error(
          `Access Denied: You don't have permission to access this resource.`,
        );
      }

      // 404 Not Found - throw to ErrorBoundary
      if (status === 404) {
        throw new Error('The requested resource was not found.');
      }

      // Other server errors - throw to ErrorBoundary
      throw new Error(
        `Server Error: ${error.message || 'An unexpected error occurred'}`,
      );
    }

    // Handle network errors
    if (error instanceof Error && error.message.includes('Network')) {
      throw new Error(
        'Network Error: Unable to connect to the server. Please check your internet connection.',
      );
    }

    // Handle redirect responses (don't catch redirects)
    if (error instanceof Response) {
      throw error;
    }

    // For unknown errors, redirect to sign-in as fallback
    throw redirect('/sign-in');
  }
}

export default function AuthenticatedLayout() {
  const { data: me } = useGetMeQuery();
  useAuthErrorHandler();

  useEffect(() => {
    if (!me || me.authenticated !== true) return;
    initCrisp();
    setCrispUserInfo(me.user.email);
  }, [me]);

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
