import { Outlet, useNavigate, useParams } from 'react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PMBox, PMHStack } from '@packmind/ui';
import { SidebarNavigation } from '../../src/domain/organizations/components/SidebarNavigation';
import { SidebarCollapseProvider } from '../../src/domain/organizations/components/SidebarCollapseContext';
import { useGetMeQuery } from '../../src/domain/accounts/api/queries/UserQueries';
import { useAuthErrorHandler } from '../../src/domain/accounts/hooks/useAuthErrorHandler';
import {
  initCrisp,
  setCrispUserInfo,
} from '@packmind/proprietary/frontend/services/vendors/CrispService';
import { SkeletonLayout } from '../../src/domain/organizations/components/SkeletonLayout';
import { OnboardingIntentModal } from '../../src/domain/accounts/components/OnboardingIntentModal';
import {
  useGetOnboardingStatusQuery,
  useCompleteOnboardingMutation,
} from '../../src/domain/accounts/api/queries/OnboardingQueries';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import type { MiddlewareFunction } from 'react-router';

// Middleware runs BEFORE all child loaders — ensures org context is correct.
// Child loaders can safely read from TanStack Query cache without any special call.
export const clientMiddleware: MiddlewareFunction[] = [
  async ({ params }) => {
    await ensureOrgContext((params as { orgSlug: string }).orgSlug);
  },
];

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export default function AuthenticatedLayout() {
  const { data: me, isLoading } = useGetMeQuery();
  const { data: onboardingStatus } = useGetOnboardingStatusQuery();
  const completeOnboardingMutation = useCompleteOnboardingMutation();
  const navigate = useNavigate();
  const params = useParams();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed));
    } catch {
      // Storage unavailable — preference won't persist, but toggle still works
    }
  }, [isSidebarCollapsed]);

  const sidebarCollapseValue = useMemo(
    () => ({
      isCollapsed: isSidebarCollapsed,
      onToggleCollapse: handleToggleSidebar,
    }),
    [isSidebarCollapsed, handleToggleSidebar],
  );

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

    if (!me || !me.authenticated) {
      if (!window.location.pathname.includes('/sign-in')) {
        navigate('/sign-in');
      }
      return;
    }

    // Org switch is handled by clientMiddleware (ensureOrgContext) above.

    initCrisp();
    setCrispUserInfo(me.user.email);
  }, [me, isLoading, navigate]);

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
    <SidebarCollapseProvider value={sidebarCollapseValue}>
      <PMHStack
        h="100%"
        w="100%"
        alignItems={'stretch'}
        gap={0}
        overflow={'hidden'}
      >
        <SidebarNavigation
          organization={me.organization}
          contentAreaRef={contentAreaRef}
        />
        <PMBox flex={'1'} h="100%" overflow={'auto'} position="relative">
          <div ref={contentAreaRef} style={{ height: '100%' }}>
            <Outlet />
          </div>
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
    </SidebarCollapseProvider>
  );
}
