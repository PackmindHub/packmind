import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMAlert,
  PMSpinner,
  PMButton,
} from '@packmind/ui';
import { gitHubAppGateway } from '../../src/domain/git/api/gateways';
import { useAuthContext } from '../../src/domain/accounts/hooks';

export default function GitHubAppInstallCallbackRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { organization } = useAuthContext();
  const [error, setError] = useState<string | null>(null);
  const hasRunRef = useRef(false);

  const installationIdRaw = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action');
  const stateOrgSlug = searchParams.get('state');

  const resolvedOrgSlug = stateOrgSlug ?? organization?.slug;

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    if (setupAction && setupAction !== 'install') {
      const target = resolvedOrgSlug
        ? `/org/${resolvedOrgSlug}/settings/git?tab=github-app`
        : '/';
      navigate(target);
      return;
    }

    if (!installationIdRaw) {
      setError('Missing installation_id parameter — please retry.');
      return;
    }

    const installationId = parseInt(installationIdRaw, 10);
    if (isNaN(installationId)) {
      setError('Invalid installation_id parameter — please retry.');
      return;
    }

    gitHubAppGateway
      .linkInstallation(installationId)
      .then(() => {
        const target = resolvedOrgSlug
          ? `/org/${resolvedOrgSlug}/settings/git?tab=github-app`
          : '/';
        navigate(target);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(message);
      });
    // Run once on mount — deps intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <PMVStack gap={6} align="stretch">
        <PMBox textAlign="center">
          <PMHeading level="h2">GitHub App installation failed</PMHeading>
        </PMBox>

        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Installation error</PMAlert.Title>
            <PMAlert.Description>{error}</PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>

        <PMBox textAlign="center">
          {resolvedOrgSlug ? (
            <PMButton
              variant="secondary"
              onClick={() =>
                navigate(`/org/${resolvedOrgSlug}/settings/git?tab=github-app`)
              }
            >
              Back to settings
            </PMButton>
          ) : (
            <PMButton variant="secondary" onClick={() => navigate('/')}>
              Go to home
            </PMButton>
          )}
        </PMBox>
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={6} align="center">
      <PMSpinner />
      <PMText color="secondary">Linking GitHub App installation…</PMText>
    </PMVStack>
  );
}
