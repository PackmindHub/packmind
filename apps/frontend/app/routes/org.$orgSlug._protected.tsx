import { Outlet, useNavigate, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { PMBox, PMHStack } from '@packmind/ui';
import { SidebarNavigation } from '../../src/domain/organizations/components/SidebarNavigation';
import { useGetMeQuery } from '../../src/domain/accounts/api/queries/UserQueries';
import { useAuthErrorHandler } from '../../src/domain/accounts/hooks/useAuthErrorHandler';
import {
  initCrisp,
  setCrispUserInfo,
} from '@packmind/proprietary/frontend/services/vendors/CrispService';
import { AuthService } from '../../src/services/auth/AuthService';
import { SkeletonLayout } from '../../src/domain/organizations/components/SkeletonLayout';
import { OnboardingIntentModal } from '../../src/domain/accounts/components/OnboardingIntentModal';
import {
  useGetOnboardingStatusQuery,
  useCompleteOnboardingMutation,
} from '../../src/domain/accounts/api/queries/OnboardingQueries';

// NO clientLoader exported here to prevent blocking!

export default function AuthenticatedLayout() {
  const { data: me, isLoading } = useGetMeQuery();
  const { data: onboardingStatus } = useGetOnboardingStatusQuery();
  const completeOnboardingMutation = useCompleteOnboardingMutation();
  const navigate = useNavigate();
  const params = useParams();
  const authService = AuthService.getInstance();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  useAuthErrorHandler();

  // Show modal based on server state
  useEffect(() => {
    if (!me?.authenticated || !onboardingStatus) return;

    if (onboardingStatus.showOnboarding) {
      setShowOnboardingModal(true);
    }
  }, [me?.authenticated, onboardingStatus]);

  const handleOnboardingComplete = () => {
    completeOnboardingMutation.mutate();
    setShowOnboardingModal(false);
  };

  const handleOnboardingSkip = () => {
    completeOnboardingMutation.mutate();
    setShowOnboardingModal(false);
  };

  useEffect(() => {
    if (isLoading) return;

    // 1. Unauthenticated -> Redirect to Sign In
    if (!me || !me.authenticated) {
      if (!window.location.pathname.includes('/sign-in')) {
        navigate('/sign-in');
      }
      return;
    }

    // 2. Org Switch Check
    // If the URL has an org slug, but the user context has a DIFFERENT slug, switch context.
    if (
      me.organization?.slug &&
      params.orgSlug &&
      me.organization.slug !== params.orgSlug &&
      !AuthService.getIsSwitching()
    ) {
      // validateAndSwitchIfNeeded sets/clears the switching flag internally
      void authService
        .validateAndSwitchIfNeeded(params.orgSlug)
        .then((result) => {
          if (!result.success || !result.hasAccess) {
            // Access denied or invalid org -> fallback to user's 'current' org dashboard
            navigate(`/org/${me.organization?.slug}`);
          }
          // If success, the query cache invalidation in authService triggers a re-render with new data
        });
      return; // Exit early to prevent Crisp init during switch
    }

    // 3. Crisp Init
    initCrisp();
    setCrispUserInfo(me.user.email);
  }, [me, isLoading, navigate, params.orgSlug]);

  // OPTIMISTIC UI: Show Skeleton while loading (initial fetch or org switch)
  // Also keep skeleton if we are technically 'authenticated' but switching orgs (mismatched slugs)
  const isSwitchingOrg =
    me?.authenticated &&
    params.orgSlug &&
    me.organization?.slug !== params.orgSlug;

  if (isLoading || !me || isSwitchingOrg) {
    return <SkeletonLayout />;
  }

  return (
    <>
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
      <OnboardingIntentModal
        open={showOnboardingModal}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        stepsToShow={
          onboardingStatus?.stepsToShow ?? ['welcome', 'playbook', 'build']
        }
      />
    </>
  );
}
