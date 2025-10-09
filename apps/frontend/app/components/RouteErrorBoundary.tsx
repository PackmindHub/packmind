import React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import * as Sentry from '@sentry/react';
import {
  PMBox,
  PMHeading,
  PMText,
  PMButton,
  PMVStack,
  PMAlert,
  UIProvider,
  PMImage,
} from '@packmind/ui';
import { logoPackmindText } from '@packmind/assets';

interface ErrorPageLayoutProps {
  children: React.ReactNode;
}

function ErrorPageLayout({ children }: ErrorPageLayoutProps) {
  return (
    <UIProvider>
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="100vh"
        p={8}
      >
        <PMVStack gap={6} maxW="600px" alignItems="center">
          <PMImage src={logoPackmindText} maxHeight="32px" mb={4} />
          {children}
        </PMVStack>
      </PMBox>
    </UIProvider>
  );
}

export function RouteErrorBoundary() {
  const error = useRouteError();

  // Log to Sentry
  React.useEffect(() => {
    if (error) {
      Sentry.captureException(error, {
        tags: { errorBoundary: 'route' },
      });
    }
  }, [error]);

  // Handle React Router errors (404, etc.)
  if (isRouteErrorResponse(error)) {
    return (
      <ErrorPageLayout>
        <PMHeading size="xl" textAlign="center">
          {error.status} - {error.statusText}
        </PMHeading>
        <PMText textAlign="center">
          {error.status === 404
            ? "The page you're looking for doesn't exist."
            : 'An error occurred while loading this page.'}
        </PMText>
        <PMBox width="full" display="flex" flexDirection="column" gap={3}>
          <PMButton onClick={() => (window.location.href = '/')} width="full">
            Go to Home
          </PMButton>
          <PMButton
            onClick={() => window.history.back()}
            variant="outline"
            width="full"
          >
            Go Back
          </PMButton>
        </PMBox>
      </ErrorPageLayout>
    );
  }

  // Handle generic errors
  const errorMessage =
    error instanceof Error ? error.message : 'An unknown error occurred';

  return (
    <ErrorPageLayout>
      <PMHeading size="xl" textAlign="center">
        Page Error
      </PMHeading>
      <PMText textAlign="center">
        This page encountered an error. Please try going back or reloading.
      </PMText>
      <PMAlert.Root status="error">
        <PMAlert.Indicator />
        <PMBox>
          <PMAlert.Title>Error Details</PMAlert.Title>
          <PMAlert.Description>{errorMessage}</PMAlert.Description>
        </PMBox>
      </PMAlert.Root>
      <PMBox width="full" display="flex" flexDirection="column" gap={3}>
        <PMButton onClick={() => window.history.back()} width="full">
          Go Back
        </PMButton>
        <PMButton
          onClick={() => window.location.reload()}
          variant="outline"
          width="full"
        >
          Reload Page
        </PMButton>
      </PMBox>
    </ErrorPageLayout>
  );
}
