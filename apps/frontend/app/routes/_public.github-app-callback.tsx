import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  PMAlert,
  PMButton,
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

  const installationId = rawInstallationId ? Number(rawInstallationId) : null;
  const isValidInstallationId =
    installationId !== null && !Number.isNaN(installationId);
  // GitHub sends 'install' for new, 'update' for re-installs. Both are acceptable.
  // 'request' means a user requested an install (no installationId yet) — skip.
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

  // Read state from localStorage once we know the org id
  const state = useMemo(() => {
    if (!me?.authenticated || !me.organization?.id) return null;
    try {
      return window.localStorage.getItem(
        `pm.gh-app.state.${me.organization.id}`,
      );
    } catch {
      return null;
    }
  }, [me?.authenticated, me?.organization?.id]);

  // Fire the callback POST exactly once
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

    callbackMutation.mutate(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      { installationId: installationId!, state },
      {
        onSuccess: (provider) => {
          try {
            window.localStorage.removeItem(
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              `pm.gh-app.state.${me.organization!.id}`,
            );
          } catch {
            // ignore
          }
          window.opener?.postMessage(
            {
              type: 'packmind:github-app-installed',
              providerId: provider.id,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              orgId: me.organization!.id,
            },
            window.location.origin,
          );
          // Small delay so the parent processes the message before we tear down the window.
          window.setTimeout(() => window.close(), 50);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isValidInstallationId,
    isValidSetupAction,
    state,
    me?.authenticated,
    me?.organization?.id,
    retryCount,
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

  // Mutation success
  if (callbackMutation.isSuccess) {
    return (
      <PMVStack gap={4} alignItems="stretch">
        <PMAlert.Root status="success">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Install complete</PMAlert.Title>
            <PMAlert.Description>
              Install complete — you can close this window.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      </PMVStack>
    );
  }

  // Initial state while waiting for effect to fire
  return (
    <PMVStack gap={4} align="center">
      <PMHStack gap={2} justify="center">
        <PMSpinner size="sm" />
        <PMText color="secondary">Completing GitHub App install…</PMText>
      </PMHStack>
    </PMVStack>
  );
}
