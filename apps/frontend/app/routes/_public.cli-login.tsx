import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  PMHeading,
  PMVStack,
  PMBox,
  PMText,
  PMButton,
  PMSpinner,
  PMAlert,
  PMCopiable,
  PMInputGroup,
  PMInput,
  PMIconButton,
  PMHStack,
} from '@packmind/ui';
import { LuCopy } from 'react-icons/lu';
import { useGetMeQuery } from '../../src/domain/accounts/api/queries';
import { AuthGatewayApi } from '../../src/domain/accounts/api/gateways/AuthGatewayApi';
import { routes } from '../../src/shared/utils/routes';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

type CallbackStatus = 'idle' | 'connecting' | 'success' | 'error';

export default function CliLoginRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [callbackStatus, setCallbackStatus] = useState<CallbackStatus>('idle');

  const callbackUrl = searchParams.get('callback_url');
  const analytics = useAnalytics();

  // Check authentication status
  const { data: me, isLoading: authLoading } = useGetMeQuery();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && (!me || !me.authenticated)) {
      const returnUrl = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      navigate(`/sign-in?returnUrl=${returnUrl}`);
    }
  }, [me, authLoading, navigate]);

  // Load the CLI login code once authenticated
  useEffect(() => {
    async function loadCode() {
      if (!me?.authenticated) return;

      setCodeLoading(true);
      setCodeError(null);
      try {
        const authGateway = new AuthGatewayApi();
        const response = await authGateway.createCliLoginCode();
        setCode(response.code);
        setExpiresAt(new Date(response.expiresAt));
      } catch {
        setCodeError('Failed to generate login code.');
      } finally {
        setCodeLoading(false);
      }
    }
    loadCode();
  }, [me?.authenticated]);

  // Send code to CLI callback via background fetch
  useEffect(() => {
    async function sendToCallback() {
      if (!code || !callbackUrl) return;

      setCallbackStatus('connecting');
      try {
        const response = await fetch(
          `${callbackUrl}?code=${encodeURIComponent(code)}`,
        );
        if (response.ok) {
          analytics.track('cli_login_done', {});
          setCallbackStatus('success');
        } else {
          setCallbackStatus('error');
        }
      } catch {
        setCallbackStatus('error');
      }
    }
    sendToCallback();
  }, [code, callbackUrl, analytics]);

  const formatExpiresAt = (date: Date) => {
    const minutes = Math.ceil((date.getTime() - Date.now()) / 60000);
    if (minutes <= 0) return 'Expired';
    if (minutes === 1) return 'Expires in 1 minute';
    return `Expires in ${minutes} minutes`;
  };

  const handleRetry = () => {
    window.location.reload();
  };

  // Build the CLI command with optional --host flag
  const buildCliCommand = (loginCode: string) => {
    const currentHost = window.location.origin;
    const isDefaultHost = currentHost === 'https://app.packmind.ai';
    const hostFlag = isDefaultHost ? '' : ` --host ${currentHost}`;
    return `packmind-cli login${hostFlag} --code ${loginCode}`;
  };

  // Render the code input section - shown whenever code is available
  const renderCodeSection = () => {
    if (!code) return null;

    const cliCommand = buildCliCommand(code);

    return (
      <>
        <PMVStack gap={4} align="stretch">
          <PMText textAlign="center" fontWeight="medium">
            Run this command in your terminal:
          </PMText>
          <PMCopiable.Root value={cliCommand}>
            <PMInputGroup
              endElement={
                <PMCopiable.Trigger asChild>
                  <PMIconButton
                    aria-label="Copy command to clipboard"
                    variant="outline"
                    size="sm"
                    me="-2"
                  >
                    <PMCopiable.Indicator copied="Copied!">
                      <LuCopy />
                    </PMCopiable.Indicator>
                  </PMIconButton>
                </PMCopiable.Trigger>
              }
            >
              <PMInput
                value={cliCommand}
                readOnly
                fontFamily="mono"
                fontSize="sm"
              />
            </PMInputGroup>
          </PMCopiable.Root>
        </PMVStack>

        {expiresAt && (
          <PMText textAlign="center" color="secondary" variant="small">
            {formatExpiresAt(expiresAt)}
          </PMText>
        )}
      </>
    );
  };

  // Render the callback status indicator
  const renderCallbackStatus = () => {
    if (!callbackUrl) {
      return (
        <PMText textAlign="center" color="secondary">
          Copy the command above and run it in your terminal to complete login.
        </PMText>
      );
    }

    switch (callbackStatus) {
      case 'connecting':
        return (
          <PMHStack gap={2} justify="center">
            <PMSpinner size="sm" />
            <PMText color="secondary">Sending code to CLI...</PMText>
          </PMHStack>
        );
      case 'success':
        return (
          <PMAlert.Root status="success">
            <PMAlert.Indicator />
            <PMAlert.Content>
              <PMAlert.Title>Login successful!</PMAlert.Title>
              <PMAlert.Description>
                You can close this window and return to your terminal.
              </PMAlert.Description>
            </PMAlert.Content>
          </PMAlert.Root>
        );
      case 'error':
        return (
          <PMAlert.Root status="warning">
            <PMAlert.Indicator />
            <PMAlert.Content>
              <PMAlert.Title>Could not connect to CLI</PMAlert.Title>
              <PMAlert.Description>
                Copy the command above and run it in your terminal.
              </PMAlert.Description>
            </PMAlert.Content>
          </PMAlert.Root>
        );
      default:
        return null;
    }
  };

  // Show loading while checking auth
  if (authLoading || (!me?.authenticated && !codeError)) {
    return (
      <PMVStack gap={6} align="center">
        <PMBox textAlign="center">
          <PMHeading level="h2">CLI Login</PMHeading>
        </PMBox>
        <PMSpinner size="lg" />
        <PMText color="secondary">Checking authentication...</PMText>
      </PMVStack>
    );
  }

  // Show loading while generating code
  if (codeLoading) {
    return (
      <PMVStack gap={6} align="center">
        <PMBox textAlign="center">
          <PMHeading level="h2">CLI Login</PMHeading>
        </PMBox>
        <PMSpinner size="lg" />
        <PMText color="secondary">Generating login code...</PMText>
      </PMVStack>
    );
  }

  // Show error if code generation failed
  if (codeError) {
    return (
      <PMVStack gap={6} align="stretch">
        <PMBox textAlign="center">
          <PMHeading level="h2">CLI Login</PMHeading>
        </PMBox>
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Error</PMAlert.Title>
            <PMAlert.Description>{codeError}</PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
        <PMButton onClick={handleRetry}>Try Again</PMButton>
      </PMVStack>
    );
  }

  const handleGoToOrganization = () => {
    if (me?.organization?.slug) {
      navigate(routes.org.toDashboard(me.organization.slug));
    }
  };

  // Main view with code and status
  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">CLI Login</PMHeading>
      </PMBox>

      {callbackStatus !== 'success' && renderCodeSection()}
      {renderCallbackStatus()}

      <PMText textAlign="center" variant="small" color="tertiary">
        This code will only work once and is tied to your current organization.
      </PMText>

      {me?.organization?.slug && (
        <PMButton variant="outline" onClick={handleGoToOrganization}>
          Go to Packmind
        </PMButton>
      )}
    </PMVStack>
  );
}
