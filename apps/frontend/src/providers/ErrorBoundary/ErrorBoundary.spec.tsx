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
    it('renders children when no error occurs', () => {
      renderWithUI(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('catches rendering errors and displays fallback UI', () => {
      renderWithUI(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it('displays error message in fallback UI', () => {
      renderWithUI(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('Sentry Integration', () => {
    describe('when error is caught', () => {
      it('logs errors to Sentry', () => {
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
    });

    it('includes correct error boundary level in Sentry tags', () => {
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
    describe('when level is "app"', () => {
      beforeEach(() => {
        renderWithUI(
          <ErrorBoundary level="app">
            <ThrowError />
          </ErrorBoundary>,
        );
      });

      it('renders error message', () => {
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      });

      it('renders Reload Application button', () => {
        expect(screen.getByText('Reload Application')).toBeInTheDocument();
      });

      it('renders Try Again button', () => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    describe('when level is "route"', () => {
      beforeEach(() => {
        renderWithUI(
          <ErrorBoundary level="route">
            <ThrowError />
          </ErrorBoundary>,
        );
      });

      it('renders Page Error message', () => {
        expect(screen.getByText('Page Error')).toBeInTheDocument();
      });

      it('renders Go Back button', () => {
        expect(screen.getByText('Go Back')).toBeInTheDocument();
      });

      it('renders Reload Page button', () => {
        expect(screen.getByText('Reload Page')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      renderWithUI(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    describe('when error occurs', () => {
      it('displays error state initially', () => {
        renderWithUI(
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>,
        );

        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      });
    });

    describe('when Try Again is clicked and component re-renders without error', () => {
      it('recovers to normal state', () => {
        const { rerender } = renderWithUI(
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>,
        );

        const tryAgainButton = screen.getByText('Try Again');
        tryAgainButton.click();

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
  });

  describe('Custom Error Handler', () => {
    describe('when onError handler is provided', () => {
      it('calls custom onError handler', () => {
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
  });

  describe('Error Message Display', () => {
    it('displays specific error message from thrown error', () => {
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

    describe('when error has no message', () => {
      it('displays generic message', () => {
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
});
