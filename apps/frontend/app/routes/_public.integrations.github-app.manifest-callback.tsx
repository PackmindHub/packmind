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

export default function GitHubAppManifestCallbackRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { organization } = useAuthContext();
  const [error, setError] = useState<string | null>(null);
  const hasRunRef = useRef(false);

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    if (!code || !state) {
      setError('Missing manifest exchange parameters — please retry.');
      return;
    }

    gitHubAppGateway
      .registerFromManifest(code, state)
      .then(() => {
        if (organization?.slug) {
          navigate(`/org/${organization.slug}/settings/git?tab=github-app`);
        } else {
          navigate('/');
        }
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
          <PMHeading level="h2">GitHub App registration failed</PMHeading>
        </PMBox>

        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Registration error</PMAlert.Title>
            <PMAlert.Description>{error}</PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>

        <PMBox textAlign="center">
          {organization?.slug ? (
            <PMButton
              variant="secondary"
              onClick={() =>
                navigate(
                  `/org/${organization.slug}/settings/git?tab=github-app`,
                )
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
      <PMText color="secondary">Completing GitHub App registration…</PMText>
    </PMVStack>
  );
}
