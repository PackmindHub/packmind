import { Outlet, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';

// Onboarding routes that should remain accessible after org creation
const ONBOARDING_ROUTES = ['/sign-up/onboarding-reason'];

/**
 * Loader for sign-up routes - redirects authenticated users who have completed sign-up
 * If user is authenticated with an organization, they shouldn't access sign-up pages
 * Exception: onboarding routes are accessible for users who just created an org
 */
export async function clientLoader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const isOnboardingRoute = ONBOARDING_ROUTES.some((route) =>
      url.pathname.startsWith(route),
    );

    // Check if user is authenticated
    const me = await queryClient.ensureQueryData(getMeQueryOptions());

    // If authenticated with an organization, redirect to org home
    // UNLESS they're on an onboarding route (completing post-signup flow)
    if (me?.authenticated && me.organization && !isOnboardingRoute) {
      throw redirect(`/org/${me.organization.slug}`);
    }

    // User is not authenticated, has no organization, or is on onboarding route - allow access
    return null;
  } catch (error) {
    // If error is a redirect, rethrow it
    if (
      error instanceof Response &&
      error.status >= 300 &&
      error.status < 400
    ) {
      throw error;
    }

    // For any other error (e.g., network issue), allow access to sign-up
    // This ensures users can still access sign-up pages if the API is down
    return null;
  }
}

export default function SignUpLayout() {
  return <Outlet />;
}
