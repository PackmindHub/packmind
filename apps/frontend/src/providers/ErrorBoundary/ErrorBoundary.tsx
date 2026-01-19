import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import {
  PMBox,
  PMButton,
  PMHeading,
  PMImage,
  PMText,
  PMVStack,
  PMAlert,
  UIProvider,
} from '@packmind/ui';
import { logoPackmindText } from '@packmind/assets';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'app' | 'route';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches React rendering errors and displays a fallback UI.
 *
 * Features:
 * - Catches errors during rendering, in lifecycle methods, and in constructors
 * - Integrates with Sentry for error logging
 * - Provides user-friendly fallback UI with recovery options
 * - Supports app-level and route-level error boundaries
 *
 * Limitations (by design):
 * - Does NOT catch errors in event handlers (use try-catch)
 * - Does NOT catch errors in asynchronous code (use try-catch or .catch())
 * - Does NOT catch errors in server-side rendering
 * - Does NOT catch errors thrown in the error boundary itself
 *
 * @example
 * ```tsx
 * <ErrorBoundary level="route">
 *   <MyRouteComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      level: 'error',
      tags: {
        errorBoundary: this.props.level || 'unknown',
      },
    });

    // Store error info for display (in dev mode)
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoBack = (): void => {
    window.history.back();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI based on level
      return this.renderDefaultFallback();
    }

    return this.props.children;
  }

  private renderDefaultFallback(): ReactNode {
    const { level = 'app' } = this.props;
    const { error, errorInfo } = this.state;

    // App-level error (most severe)
    if (level === 'app') {
      return (
        <UIProvider>
          <PMBox
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minH="100vh"
            p={8}
          >
            <PMVStack gap={6} maxW="600px" alignItems="center">
              <PMImage src={logoPackmindText} maxHeight="32px" />
              <PMHeading size="2xl" textAlign="center">
                Oops! Something went wrong
              </PMHeading>
              <PMText fontSize="lg" textAlign="center">
                We're sorry, but the application encountered an unexpected
                error. Our team has been notified and we're working on a fix.
              </PMText>
              <PMAlert.Root status="error">
                <PMAlert.Indicator />
                <PMBox>
                  <PMAlert.Title>Error Details</PMAlert.Title>
                  <PMAlert.Description>
                    {error?.message || 'An unknown error occurred'}
                  </PMAlert.Description>
                </PMBox>
              </PMAlert.Root>
              <PMButton onClick={this.handleReload} size="lg">
                Reload Application
              </PMButton>
              <PMButton onClick={this.handleReset} variant="outline">
                Try Again
              </PMButton>
              {process.env.NODE_ENV === 'development' && errorInfo && (
                <PMBox
                  mt={6}
                  p={4}
                  borderRadius="md"
                  fontSize="xs"
                  fontFamily="mono"
                  textAlign="left"
                  maxH="200px"
                  overflow="auto"
                >
                  <PMText fontWeight="bold" mb={2}>
                    Component Stack (Dev Only):
                  </PMText>
                  <pre>{errorInfo.componentStack}</pre>
                </PMBox>
              )}
            </PMVStack>
          </PMBox>
        </UIProvider>
      );
    }

    // Route-level error
    return (
      <UIProvider>
        <PMBox p={8} maxW="800px" mx="auto">
          <PMVStack gap={6} alignItems="center">
            <PMImage src={logoPackmindText} maxHeight="32px" />
            <PMHeading size="xl" textAlign="center">
              Page Error
            </PMHeading>
            <PMText textAlign="center">
              This page encountered an error while loading. You can try going
              back or reloading the page.
            </PMText>
            <PMAlert.Root status="error">
              <PMAlert.Indicator />
              <PMBox>
                <PMAlert.Title>Error Details</PMAlert.Title>
                <PMAlert.Description>
                  {error?.message || 'An unknown error occurred'}
                </PMAlert.Description>
              </PMBox>
            </PMAlert.Root>
            <PMButton onClick={this.handleGoBack}>Go Back</PMButton>
            <PMButton onClick={this.handleReload} variant="outline">
              Reload Page
            </PMButton>
            <PMButton onClick={this.handleReset} variant="ghost" size="sm">
              Try Again
            </PMButton>
            {process.env.NODE_ENV === 'development' && errorInfo && (
              <PMBox
                mt={4}
                p={4}
                borderRadius="md"
                fontSize="xs"
                fontFamily="mono"
                maxH="200px"
                overflow="auto"
              >
                <PMText fontWeight="bold" mb={2}>
                  Component Stack (Dev Only):
                </PMText>
                <pre>{errorInfo.componentStack}</pre>
              </PMBox>
            )}
          </PMVStack>
        </PMBox>
      </UIProvider>
    );
  }
}
