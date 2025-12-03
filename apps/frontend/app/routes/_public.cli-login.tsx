import { useState, useEffect } from 'react';
import { redirect, useSearchParams } from 'react-router';
import {
  PMHeading,
  PMVStack,
  PMBox,
  PMText,
  PMButton,
  PMHStack,
  PMInput,
  PMSpinner,
  PMIcon,
} from '@packmind/ui';
import { LuCopy, LuCheck } from 'react-icons/lu';
import type { LoaderFunctionArgs } from 'react-router';
import { AuthService } from '../../src/services/auth/AuthService';
import { AuthGatewayApi } from '../../src/domain/accounts/api/gateways/AuthGatewayApi';

export async function clientLoader({ request }: LoaderFunctionArgs) {
  const authService = AuthService.getInstance();

  try {
    const me = await authService.getMe();

    // Condition: not authenticated → redirect to sign-in with return URL
    if (!me.authenticated) {
      const url = new URL(request.url);
      const returnUrl = encodeURIComponent(url.pathname + url.search);
      throw redirect(`/sign-in?returnUrl=${returnUrl}`);
    }

    // Create the CLI login code
    const authGateway = new AuthGatewayApi();
    const cliLoginCode = await authGateway.createCliLoginCode();

    return {
      me,
      code: cliLoginCode.code,
      expiresAt: cliLoginCode.expiresAt,
    };
  } catch (error) {
    // Handle redirect responses (don't catch redirects)
    if (error instanceof Response) {
      throw error;
    }

    // For unknown errors, redirect to sign-in
    throw redirect('/sign-in');
  }
}

export default function CliLoginRoute() {
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get('callback_url');

  useEffect(() => {
    async function loadCode() {
      try {
        const authGateway = new AuthGatewayApi();
        const response = await authGateway.createCliLoginCode();
        setCode(response.code);
        setExpiresAt(new Date(response.expiresAt));
        setLoading(false);
      } catch {
        setError('Failed to generate login code. Please try again.');
        setLoading(false);
      }
    }
    loadCode();
  }, []);

  const handleCopy = async () => {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatExpiresAt = (date: Date) => {
    const minutes = Math.ceil((date.getTime() - Date.now()) / 60000);
    if (minutes <= 0) return 'Expired';
    if (minutes === 1) return 'Expires in 1 minute';
    return `Expires in ${minutes} minutes`;
  };

  if (loading) {
    return (
      <PMVStack gap={6} align="center" py={8}>
        <PMSpinner size="lg" />
        <PMText>Generating login code...</PMText>
      </PMVStack>
    );
  }

  if (error) {
    return (
      <PMVStack gap={6} align="stretch">
        <PMBox textAlign="center">
          <PMHeading level="h2">CLI Login</PMHeading>
        </PMBox>
        <PMText color="error" textAlign="center">
          {error}
        </PMText>
        <PMButton onClick={() => window.location.reload()}>Try Again</PMButton>
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">CLI Login</PMHeading>
      </PMBox>

      <PMText textAlign="center">
        Copy the code below and paste it into the CLI to complete the login.
      </PMText>

      <PMBox
        bg="gray.100"
        p={4}
        borderRadius="md"
        fontFamily="mono"
        fontSize="2xl"
        textAlign="center"
        letterSpacing="0.2em"
      >
        <PMHStack justify="center" gap={4}>
          <PMInput
            value={code || ''}
            readOnly
            textAlign="center"
            fontSize="2xl"
            fontFamily="mono"
            letterSpacing="0.2em"
            fontWeight="bold"
            bg="white"
            borderColor="gray.300"
          />
          <PMButton
            onClick={handleCopy}
            variant={copied ? 'secondary' : 'primary'}
            size="lg"
          >
            <PMHStack gap={2}>
              <PMIcon as={copied ? LuCheck : LuCopy} />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </PMHStack>
          </PMButton>
        </PMHStack>
      </PMBox>

      {expiresAt && (
        <PMText textAlign="center" color="faded" variant="small">
          {formatExpiresAt(expiresAt)}
        </PMText>
      )}

      {callbackUrl && (
        <PMText textAlign="center" color="faded" variant="small">
          The CLI is waiting at: {callbackUrl}
        </PMText>
      )}

      <PMBox mt={4} textAlign="center">
        <PMText variant="small" color="tertiary">
          This code will only work once and is tied to your current
          organization.
        </PMText>
      </PMBox>
    </PMVStack>
  );
}
