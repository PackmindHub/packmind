import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import SocialLoginButtons from './SocialLoginButtons';
import { useSocialProvidersQuery } from '../api/queries/AuthQueries';

jest.mock('../api/queries/AuthQueries', () => ({
  useSocialProvidersQuery: jest.fn(),
}));

jest.mock('react-icons/si', () => ({
  SiGoogle: () => <span data-testid="icon-google" />,
  SiGithub: () => <span data-testid="icon-github" />,
}));

jest.mock('react-icons/fa', () => ({
  FaMicrosoft: () => <span data-testid="icon-microsoft" />,
}));

const mockUseSocialProvidersQuery =
  useSocialProvidersQuery as jest.MockedFunction<
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
    jest.clearAllMocks();
  });

  describe('when providers are available', () => {
    beforeEach(() => {
      mockUseSocialProvidersQuery.mockReturnValue({
        data: {
          providers: ['GoogleOAuth', 'GitHubOAuth', 'MicrosoftOAuth'],
        },
        isLoading: false,
      } as ReturnType<typeof useSocialProvidersQuery>);
    });

    it('renders Google button', () => {
      renderComponent();
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('renders GitHub button', () => {
      renderComponent();
      expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
    });

    it('renders Microsoft button', () => {
      renderComponent();
      expect(screen.getByText('Continue with Microsoft')).toBeInTheDocument();
    });

    it('renders or divider between buttons and form', () => {
      renderComponent();
      expect(screen.getByText('or')).toBeInTheDocument();
    });
  });

  describe('when providers list is empty', () => {
    beforeEach(() => {
      mockUseSocialProvidersQuery.mockReturnValue({
        data: { providers: [] },
        isLoading: false,
      } as ReturnType<typeof useSocialProvidersQuery>);
    });

    it('renders nothing', () => {
      const { container } = renderComponent();
      expect(container.innerHTML).toBe('');
    });
  });

  describe('when loading', () => {
    beforeEach(() => {
      mockUseSocialProvidersQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useSocialProvidersQuery>);
    });

    it('renders nothing', () => {
      const { container } = renderComponent();
      expect(container.innerHTML).toBe('');
    });
  });
});
