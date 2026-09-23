import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import SocialLoginButtons from './SocialLoginButtons';
import { useSocialProvidersQuery } from '../api/queries/AuthQueries';
import type { MockedFunction } from 'vitest';
import {
  createPendingQueryResult,
  createSuccessQueryResult,
} from '../../../test/queryResultMocks';

vi.mock('../api/queries/AuthQueries', () => ({
  useSocialProvidersQuery: vi.fn(),
}));

vi.mock('@packmind/assets', () => ({
  googleLogo: 'google-logo.svg',
  microsoftLogo: 'microsoft-logo.svg',
}));

vi.mock('react-icons/si', () => ({
  SiGithub: () => <span data-testid="icon-github" />,
}));

const mockUseSocialProvidersQuery = useSocialProvidersQuery as MockedFunction<
  typeof useSocialProvidersQuery
>;

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <SocialLoginButtons />
      </UIProvider>
    </QueryClientProvider>,
  );
};

describe('SocialLoginButtons', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when providers are available', () => {
    beforeEach(() => {
      mockUseSocialProvidersQuery.mockReturnValue(
        createSuccessQueryResult({
          providers: ['GoogleOAuth', 'GitHubOAuth', 'MicrosoftOAuth'],
        }),
      );
    });

    it('renders Google button', () => {
      renderComponent();
      expect(screen.getByText('Google')).toBeInTheDocument();
    });

    it('renders GitHub button', () => {
      renderComponent();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });

    it('renders Microsoft button', () => {
      renderComponent();
      expect(screen.getByText('Microsoft')).toBeInTheDocument();
    });
  });

  describe('when providers list is empty', () => {
    beforeEach(() => {
      mockUseSocialProvidersQuery.mockReturnValue(
        createSuccessQueryResult({ providers: [] }),
      );
    });

    it('renders nothing', () => {
      const { container } = renderComponent();
      expect(container.innerHTML).toBe('');
    });
  });

  describe('when loading', () => {
    beforeEach(() => {
      mockUseSocialProvidersQuery.mockReturnValue(
        createPendingQueryResult<{ providers: string[] }>(),
      );
    });

    it('renders nothing', () => {
      const { container } = renderComponent();
      expect(container.innerHTML).toBe('');
    });
  });
});
