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
import { useSubmitGithubAppManifestCallbackMutation } from '../../src/domain/git/api/queries/GitProviderQueries';
import { routes } from '../../src/shared/utils/routes';

export default function GithubAppManifestCallbackRouteModule() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { data: me, isLoading: authLoading } = useGetMeQuery();

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const manifestCallbackMutation = useSubmitGithubAppManifestCallbackMutation();
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

  // Fire the manifest-callback POST exactly once
  useEffect(() => {
    if (submittedRef.current) return;
    if (!code || !state || !me?.authenticated || !me.organization?.id) return;
    submittedRef.current = true;
    manifestCallbackMutation.mutate({ code, state });
  }, [
    code,
    state,
    me?.authenticated,
    me?.organization?.id,
    retryCount,
    manifestCallbackMutation,
  ]);

  const handleRetry = () => {
    submittedRef.current = false;
    manifestCallbackMutation.reset();
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

  // Missing required query params from GitHub redirect
  if (!code || !state) {
    return (
      <PMVStack gap={4} alignItems="stretch">
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Missing manifest context</PMAlert.Title>
            <PMAlert.Description>
              Missing manifest context — please retry from the Packmind settings
              page.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
        <PMButton onClick={handleReturnToSettings}>Return to settings</PMButton>
      </PMVStack>
    );
  }

  // Mutation pending
  if (manifestCallbackMutation.isPending) {
    return (
      <PMVStack gap={4} align="center">
        <PMHStack gap={2} justify="center">
          <PMSpinner size="sm" />
          <PMText color="secondary">Setting up GitHub App…</PMText>
        </PMHStack>
      </PMVStack>
    );
  }

  // Mutation error
  if (manifestCallbackMutation.isError) {
    const error = manifestCallbackMutation.error;
    const isAuthError =
      error &&
      'status' in error &&
      (error as { status: number }).status === 401;

    if (isAuthError) {
      return (
        <PMVStack gap={4} alignItems="stretch">
          <PMAlert.Root status="error">
            <PMAlert.Indicator />
            <PMAlert.Content>
              <PMAlert.Title>Authentication required</PMAlert.Title>
              <PMAlert.Description>
                Your session has expired. Please sign in again and retry.
              </PMAlert.Description>
            </PMAlert.Content>
          </PMAlert.Root>
          <PMHStack gap={2} justify="center">
            <PMButton onClick={() => navigate('/sign-in')}>Sign in</PMButton>
            <PMButton variant="outline" onClick={handleReturnToSettings}>
              Return to settings
            </PMButton>
          </PMHStack>
        </PMVStack>
      );
    }

    return (
      <PMVStack gap={4} alignItems="stretch">
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Setup failed</PMAlert.Title>
            <PMAlert.Description>
              {error?.message || "Couldn't connect to Packmind. Please retry."}
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
        <PMHStack gap={2} justify="center">
          <PMButton onClick={handleRetry}>Try again</PMButton>
          <PMButton variant="outline" onClick={handleReturnToSettings}>
            Return to settings
          </PMButton>
        </PMHStack>
      </PMVStack>
    );
  }

  // Mutation succeeded — redirect is in flight; show unambiguous terminal state
  if (manifestCallbackMutation.isSuccess) {
    const { installUrl } = manifestCallbackMutation.data;
    return (
      <PMVStack gap={4} align="center">
        <PMHStack gap={2} justify="center">
          <PMSpinner size="sm" />
          <PMText color="secondary">Redirecting to GitHub…</PMText>
        </PMHStack>
        <PMText fontSize="sm" color="secondary">
          If you weren&apos;t redirected,{' '}
          <PMLink href={installUrl}>click here to continue</PMLink>.
        </PMText>
      </PMVStack>
    );
  }

  // Initial state while waiting for the effect to fire (none of the mutation
  // states are true yet — code/state/auth conditions not yet satisfied)
  return (
    <PMVStack gap={4} align="center">
      <PMHStack gap={2} justify="center">
        <PMSpinner size="sm" />
        <PMText color="secondary">Initializing…</PMText>
      </PMHStack>
    </PMVStack>
  );
}
