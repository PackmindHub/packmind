import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import * as Sentry from '@sentry/react';
import { UIProvider } from '@packmind/ui';

// Mock Sentry
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
}));

// Test component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Helper to render with UIProvider
const renderWithUI = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {
      // No-op: intentionally empty to suppress error logs during tests
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error Catching', () => {
    it('should render children when no error occurs', () => {
      renderWithUI(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should catch rendering errors and display fallback UI', () => {
      renderWithUI(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it('should display error message in fallback UI', () => {
      renderWithUI(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('Sentry Integration', () => {
    it('should log errors to Sentry when error is caught', () => {
      renderWithUI(
        <ErrorBoundary level="app">
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            errorBoundary: 'app',
          },
          level: 'error',
        }),
      );
    });

    it('should include correct error boundary level in Sentry tags', () => {
      renderWithUI(
        <ErrorBoundary level="route">
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            errorBoundary: 'route',
          },
        }),
      );
    });
  });

  describe('Fallback UI Levels', () => {
    it('should render app-level fallback UI when level is "app"', () => {
      renderWithUI(
        <ErrorBoundary level="app">
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText('Reload Application')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should render route-level fallback UI when level is "route"', () => {
      renderWithUI(
        <ErrorBoundary level="route">
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Page Error')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      renderWithUI(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should allow recovery by resetting error state', () => {
      const { rerender } = renderWithUI(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

      // Click Try Again button
      const tryAgainButton = screen.getByText('Try Again');
      tryAgainButton.click();

      // Re-render with no error
      rerender(
        <UIProvider>
          <ErrorBoundary>
            <ThrowError shouldThrow={false} />
          </ErrorBoundary>
        </UIProvider>,
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Custom Error Handler', () => {
    it('should call custom onError handler when provided', () => {
      const onError = jest.fn();

      renderWithUI(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
      );
    });
  });

  describe('Error Message Display', () => {
    it('should display specific error message from thrown error', () => {
      const SpecificError = () => {
        throw new Error('Specific error message');
      };

      renderWithUI(
        <ErrorBoundary>
          <SpecificError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Specific error message')).toBeInTheDocument();
    });

    it('should display generic message when error has no message', () => {
      const NoMessageError = () => {
        // eslint-disable-next-line no-throw-literal
        throw null;
      };

      renderWithUI(
        <ErrorBoundary>
          <NoMessageError />
        </ErrorBoundary>,
      );

      expect(
        screen.getByText(/An unknown error occurred/i),
      ).toBeInTheDocument();
    });
  });
});
