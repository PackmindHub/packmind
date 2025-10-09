import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMPage,
  PMBox,
  PMVStack,
  PMButton,
  PMHeading,
  PMText,
  PMAlert,
  PMHStack,
} from '@packmind/ui';
import { ErrorBoundary } from '../../src/providers/ErrorBoundary/ErrorBoundary';

export const handle = {
  crumb: () => ({ label: 'Error Demo', to: '/error-demo' }),
};

// Simulate async error in loader
export async function clientLoader() {
  const params = new URLSearchParams(window.location.search);
  const triggerLoaderError = params.get('loaderError');

  if (triggerLoaderError === 'true') {
    throw new Error('Simulated loader error: Failed to load data');
  }

  return null;
}

// Component that can throw errors independently
function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Component-level error: This component crashed!');
  }
  return (
    <PMBox p={4} borderWidth="1px" borderRadius="md">
      <PMText>✅ This component is working correctly</PMText>
    </PMBox>
  );
}

// Custom fallback UI for the demo
const ComponentErrorFallback = (
  <PMBox p={4} borderWidth="1px" borderRadius="md">
    <PMVStack gap={2} alignItems="flex-start">
      <PMText color="error" fontWeight="bold">
        ⚠️ Component Error Caught
      </PMText>
      <PMText fontSize="sm">
        The error boundary caught this error and prevented the whole page from
        crashing.
      </PMText>
    </PMVStack>
  </PMBox>
);

export default function ErrorDemoRouteModule() {
  const navigate = useNavigate();
  const [shouldThrowPageError, setShouldThrowPageError] = useState(false);
  const [shouldThrowComponentError, setShouldThrowComponentError] =
    useState(false);
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);

  // This will trigger a page-level error
  if (shouldThrowPageError) {
    throw new Error('Page-level error: Entire route crashed!');
  }

  const handleNavigateTo404 = () => {
    // Navigate to a non-existent route to trigger 404
    navigate('/org/demo/non-existent-route-12345');
  };

  const handleTriggerPageError = () => {
    setShouldThrowPageError(true);
  };

  const handleTriggerComponentError = () => {
    setShouldThrowComponentError(true);
  };

  const handleResetComponentError = () => {
    // Reset by remounting the ErrorBoundary with a new key
    setShouldThrowComponentError(false);
    setErrorBoundaryKey((prev) => prev + 1);
  };

  const handleTriggerLoaderError = () => {
    // Reload page with query param to trigger loader error
    window.location.href = window.location.pathname + '?loaderError=true';
  };

  return (
    <PMPage
      title="Error Boundary Demo"
      subtitle="Test different error scenarios to see how the error boundary handles them"
    >
      <PMVStack gap={6} maxW="800px">
        <PMAlert.Root status="info">
          <PMAlert.Indicator />
          <PMBox>
            <PMAlert.Title>About this Demo</PMAlert.Title>
            <PMAlert.Description>
              This page demonstrates both page-level and component-level error
              boundaries. Component errors are caught locally without crashing
              the entire page.
            </PMAlert.Description>
          </PMBox>
        </PMAlert.Root>

        {/* Component-Level Error Boundary Demo */}
        <PMBox borderWidth="1px" borderRadius="md" p={6}>
          <PMVStack gap={4} alignItems="stretch">
            <PMVStack gap={2}>
              <PMHeading size="md">Component-Level Error (Isolated)</PMHeading>
              <PMText fontSize="sm">
                This error is caught by a component-level error boundary. The
                rest of the page continues to work.
              </PMText>
            </PMVStack>
            <PMBox
              as="pre"
              p={3}
              borderRadius="md"
              overflowX="auto"
              fontFamily="mono"
              fontSize="sm"
            >
              {`import { ErrorBoundary } from '@/providers/ErrorBoundary';

const fallback = (
  <Box>Error occurred!</Box>
);

// Use key prop to force remount and reset error state
<ErrorBoundary key={resetKey} fallback={fallback}>
  <MyComponent />
</ErrorBoundary>`}
            </PMBox>
            <PMBox>
              <ErrorBoundary
                key={errorBoundaryKey}
                fallback={ComponentErrorFallback}
              >
                <BuggyComponent shouldThrow={shouldThrowComponentError} />
              </ErrorBoundary>
            </PMBox>
            <PMHStack gap={2}>
              {!shouldThrowComponentError ? (
                <PMButton onClick={handleTriggerComponentError}>
                  Break Component
                </PMButton>
              ) : (
                <PMButton onClick={handleResetComponentError} variant="outline">
                  Reset Component
                </PMButton>
              )}
            </PMHStack>
          </PMVStack>
        </PMBox>

        {/* 404 Error */}
        <PMBox borderWidth="1px" borderRadius="md" p={6}>
          <PMVStack gap={4} alignItems="stretch">
            <PMVStack gap={2}>
              <PMHeading size="md">404 Error (Route Not Found)</PMHeading>
              <PMText fontSize="sm">
                Triggers a route error response when navigating to a
                non-existent route
              </PMText>
            </PMVStack>
            <PMBox
              as="pre"
              p={3}
              borderRadius="md"
              overflowX="auto"
              fontFamily="mono"
              fontSize="sm"
            >
              {`navigate('/org/demo/non-existent-route-12345')`}
            </PMBox>
            <PMHStack gap={2}>
              <PMButton onClick={handleNavigateTo404}>
                Trigger 404 Error
              </PMButton>
            </PMHStack>
          </PMVStack>
        </PMBox>

        {/* Page-Level Error */}
        <PMBox borderWidth="1px" borderRadius="md" p={6}>
          <PMVStack gap={4} alignItems="stretch">
            <PMVStack gap={2}>
              <PMHeading size="md">Page-Level Error (Entire Route)</PMHeading>
              <PMText fontSize="sm">
                Throws an error during component rendering that crashes the
                entire page
              </PMText>
            </PMVStack>
            <PMBox
              as="pre"
              p={3}
              borderRadius="md"
              overflowX="auto"
              fontFamily="mono"
              fontSize="sm"
            >
              {`throw new Error('Page-level error')`}
            </PMBox>
            <PMHStack gap={2}>
              <PMButton onClick={handleTriggerPageError}>
                Trigger Page Error
              </PMButton>
            </PMHStack>
          </PMVStack>
        </PMBox>

        {/* Loader Error */}
        <PMBox borderWidth="1px" borderRadius="md" p={6}>
          <PMVStack gap={4} alignItems="stretch">
            <PMVStack gap={2}>
              <PMHeading size="md">Loader Error</PMHeading>
              <PMText fontSize="sm">
                Throws an error in the clientLoader before rendering
              </PMText>
            </PMVStack>
            <PMBox
              as="pre"
              p={3}
              borderRadius="md"
              overflowX="auto"
              fontFamily="mono"
              fontSize="sm"
            >
              {`export async function clientLoader() {
  throw new Error('Simulated loader error');
}`}
            </PMBox>
            <PMHStack gap={2}>
              <PMButton onClick={handleTriggerLoaderError}>
                Trigger Loader Error
              </PMButton>
            </PMHStack>
          </PMVStack>
        </PMBox>

        <PMAlert.Root status="warning">
          <PMAlert.Indicator />
          <PMBox>
            <PMAlert.Title>Expected Behavior</PMAlert.Title>
            <PMAlert.Description>
              <PMVStack gap={2} alignItems="flex-start">
                <PMText>
                  • Component Error: Shows error inline, page continues working
                </PMText>
                <PMText>
                  • 404 Error: Shows custom error page with status code
                </PMText>
                <PMText>
                  • Page/Loader Errors: Shows full error page with details
                </PMText>
                <PMText>
                  • All errors are logged to Sentry for monitoring
                </PMText>
              </PMVStack>
            </PMAlert.Description>
          </PMBox>
        </PMAlert.Root>
      </PMVStack>
    </PMPage>
  );
}
