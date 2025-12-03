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
} from '@packmind/ui';
import { LuCopy } from 'react-icons/lu';
import { useGetMeQuery } from '../../src/domain/accounts/api/queries';
import { AuthGatewayApi } from '../../src/domain/accounts/api/gateways/AuthGatewayApi';

export default function CliLoginRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const callbackUrl = searchParams.get('callback_url');

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
      try {
        const authGateway = new AuthGatewayApi();
        const response = await authGateway.createCliLoginCode();
        setCode(response.code);
        setExpiresAt(new Date(response.expiresAt));
      } catch {
        setError('Failed to generate login code. Please try again.');
      } finally {
        setCodeLoading(false);
      }
    }
    loadCode();
  }, [me?.authenticated]);

  // Auto-redirect to CLI callback if provided
  useEffect(() => {
    if (code && callbackUrl) {
      setRedirecting(true);
      const redirectUrl = `${callbackUrl}?code=${encodeURIComponent(code)}`;
      // Small delay to show the code before redirecting
      const timer = setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [code, callbackUrl]);

  const formatExpiresAt = (date: Date) => {
    const minutes = Math.ceil((date.getTime() - Date.now()) / 60000);
    if (minutes <= 0) return 'Expired';
    if (minutes === 1) return 'Expires in 1 minute';
    return `Expires in ${minutes} minutes`;
  };

  // Show loading while checking auth or loading code
  if (authLoading || codeLoading || (!me?.authenticated && !error)) {
    return (
      <PMVStack gap={6} align="center">
        <PMBox textAlign="center">
          <PMHeading level="h2">CLI Login</PMHeading>
        </PMBox>
        <PMSpinner size="lg" />
        <PMText color="secondary">
          {authLoading
            ? 'Checking authentication...'
            : 'Generating login code...'}
        </PMText>
      </PMVStack>
    );
  }

  if (error) {
    return (
      <PMVStack gap={6} align="stretch">
        <PMBox textAlign="center">
          <PMHeading level="h2">CLI Login</PMHeading>
        </PMBox>
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>{error}</PMAlert.Title>
        </PMAlert.Root>
        <PMButton onClick={() => window.location.reload()}>Try Again</PMButton>
      </PMVStack>
    );
  }

  if (redirecting) {
    return (
      <PMVStack gap={6} align="center">
        <PMBox textAlign="center">
          <PMHeading level="h2">CLI Login</PMHeading>
        </PMBox>
        <PMAlert.Root status="success">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Code generated successfully!</PMAlert.Title>
            <PMAlert.Description>Redirecting to the CLI...</PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
        <PMSpinner size="lg" />
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">CLI Login</PMHeading>
      </PMBox>

      <PMText textAlign="center" color="secondary">
        Copy the code below and paste it into the CLI to complete the login.
      </PMText>

      <PMCopiable.Root value={code || ''}>
        <PMInputGroup
          endElement={
            <PMCopiable.Trigger asChild>
              <PMIconButton
                aria-label="Copy to clipboard"
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
            value={code || ''}
            readOnly
            textAlign="center"
            fontFamily="mono"
            fontWeight="bold"
            letterSpacing="0.1em"
          />
        </PMInputGroup>
      </PMCopiable.Root>

      {expiresAt && (
        <PMText textAlign="center" color="secondary" variant="small">
          {formatExpiresAt(expiresAt)}
        </PMText>
      )}

      <PMText textAlign="center" variant="small" color="tertiary">
        This code will only work once and is tied to your current organization.
      </PMText>
    </PMVStack>
  );
}
