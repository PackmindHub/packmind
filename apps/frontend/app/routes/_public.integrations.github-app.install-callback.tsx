import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  PMAlert,
  PMButton,
  PMLink,
  PMSpinner,
  PMVStack,
  PMHStack,
  PMText,
} from '@packmind/ui';
import { useGetMeQuery } from '../../src/domain/accounts/api/queries';
import { useSubmitGithubAppCallbackMutation } from '../../src/domain/git/api/queries/GitProviderQueries';
import { routes } from '../../src/shared/utils/routes';

export default function GithubAppCallbackRouteModule() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { data: me, isLoading: authLoading } = useGetMeQuery();

  const rawInstallationId = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action');
  const state = searchParams.get('state');

  const installationId = rawInstallationId ? Number(rawInstallationId) : null;
  const isValidInstallationId =
    installationId !== null && !Number.isNaN(installationId);
  const isValidSetupAction =
    setupAction === 'install' || setupAction === 'update';

  const callbackMutation = useSubmitGithubAppCallbackMutation();
  const submittedRef = useRef(false);
  const [retryCount, setRetryCount] = useState(0);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && (!me || !me.authenticated)) {
      const returnUrl = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      navigate(`/sign-in?returnUrl=${returnUrl}`);
    }
  }, [me, authLoading, navigate]);

  useEffect(() => {
    if (submittedRef.current) return;
    if (
      !isValidInstallationId ||
      !isValidSetupAction ||
      !state ||
      !me?.authenticated ||
      !me.organization?.id
    )
      return;
    submittedRef.current = true;
    callbackMutation.mutate({ installationId: installationId, state });
  }, [
    isValidInstallationId,
    isValidSetupAction,
    state,
    me?.authenticated,
    me?.organization?.id,
    retryCount,
    callbackMutation,
    installationId,
  ]);

  const handleRetry = () => {
    submittedRef.current = false;
    callbackMutation.reset();
    setRetryCount((c) => c + 1);
  };

  const handleReturnToSettings = () => {
    if (me?.authenticated && me.organization?.slug) {
      navigate(routes.org.toSettingsGit(me.organization.slug));
    }
  };

  // Auth loading or not yet authenticated
  if (authLoading || !me?.authenticated) {
    return (
      <PMVStack gap={4} align="center">
        <PMHStack gap={2} justify="center">
          <PMSpinner size="sm" />
          <PMText color="secondary">Checking authentication…</PMText>
        </PMHStack>
      </PMVStack>
    );
  }

  // Missing required inputs
  if (!isValidInstallationId || !isValidSetupAction || !state) {
    return (
      <PMVStack gap={4} alignItems="stretch">
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Missing install context</PMAlert.Title>
            <PMAlert.Description>
              Missing install context — please retry from the Packmind settings
              page.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
        <PMButton onClick={handleReturnToSettings}>Return to settings</PMButton>
      </PMVStack>
    );
  }

  // Mutation pending
  if (callbackMutation.isPending) {
    return (
      <PMVStack gap={4} align="center">
        <PMHStack gap={2} justify="center">
          <PMSpinner size="sm" />
          <PMText color="secondary">Completing GitHub App install…</PMText>
        </PMHStack>
      </PMVStack>
    );
  }

  // Mutation error
  if (callbackMutation.isError) {
    return (
      <PMVStack gap={4} alignItems="stretch">
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Install failed</PMAlert.Title>
            <PMAlert.Description>
              {callbackMutation.error?.message ??
                'An unexpected error occurred.'}
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
        <PMHStack gap={2} justify="center">
          <PMButton onClick={handleRetry}>Retry</PMButton>
          <PMButton variant="outline" onClick={handleReturnToSettings}>
            Return to settings
          </PMButton>
        </PMHStack>
      </PMVStack>
    );
  }

  // Mutation succeeded — redirect is in flight; show unambiguous terminal state
  if (callbackMutation.isSuccess) {
    const settingsHref =
      me?.organization?.slug && routes.org.toSettingsGit(me.organization.slug);
    return (
      <PMVStack gap={4} align="center">
        <PMHStack gap={2} justify="center">
          <PMSpinner size="sm" />
          <PMText color="secondary">Redirecting back to Packmind…</PMText>
        </PMHStack>
        {settingsHref && (
          <PMText fontSize="sm" color="secondary">
            If you weren&apos;t redirected,{' '}
            <PMLink href={settingsHref}>click here to continue</PMLink>.
          </PMText>
        )}
      </PMVStack>
    );
  }

  // Initial state while waiting for the effect to fire (none of the mutation
  // states are true yet — installation_id/state/auth conditions not yet satisfied)
  return (
    <PMVStack gap={4} align="center">
      <PMHStack gap={2} justify="center">
        <PMSpinner size="sm" />
        <PMText color="secondary">Initializing…</PMText>
      </PMHStack>
    </PMVStack>
  );
}
