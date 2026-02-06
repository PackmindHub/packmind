import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { GetStartedWithPackmindWidget } from './GetStartedWithPackmindWidget';
import { useAuthContext } from '../hooks/useAuthContext';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { useGetStandardsQuery } from '../../standards/api/queries/StandardsQueries';
import { useGetSkillsQuery } from '../../skills/api/queries/SkillsQueries';
import { useGetOnboardingStatusQuery } from '../api/queries/AccountsQueries';
import { useGetUsersInMyOrganizationQuery } from '../api/queries/UserQueries';

const mockNavigate = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../hooks/useAuthContext');
jest.mock('../../spaces/api/queries/SpacesQueries');
jest.mock('../../deployments/api/queries/DeploymentsQueries');
jest.mock('../../standards/api/queries/StandardsQueries');
jest.mock('../../skills/api/queries/SkillsQueries');
jest.mock('../api/queries/AccountsQueries');
jest.mock('../api/queries/UserQueries');
jest.mock('./LocalEnvironmentSetup/hooks', () => ({
  useCliLoginCode: jest.fn(() => ({
    loginCode: 'TEST-CODE-123',
    codeExpiresAt: new Date(Date.now() + 3600000),
    isGenerating: false,
    regenerate: jest.fn(),
  })),
}));

const mockedUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;
const mockedUseGetSpacesQuery = useGetSpacesQuery as jest.MockedFunction<
  typeof useGetSpacesQuery
>;
const mockedUseListPackagesBySpaceQuery =
  useListPackagesBySpaceQuery as jest.MockedFunction<
    typeof useListPackagesBySpaceQuery
  >;
const mockedUseGetStandardsQuery = useGetStandardsQuery as jest.MockedFunction<
  typeof useGetStandardsQuery
>;
const mockedUseGetSkillsQuery = useGetSkillsQuery as jest.MockedFunction<
  typeof useGetSkillsQuery
>;
const mockedUseGetOnboardingStatusQuery =
  useGetOnboardingStatusQuery as jest.MockedFunction<
    typeof useGetOnboardingStatusQuery
  >;
const mockedUseGetUsersInMyOrganizationQuery =
  useGetUsersInMyOrganizationQuery as jest.MockedFunction<
    typeof useGetUsersInMyOrganizationQuery
  >;

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
};

describe('GetStartedWithPackmindWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuthContext.mockReturnValue({
      organization: { id: 'org-1', slug: 'test-org' },
    } as ReturnType<typeof useAuthContext>);
    mockedUseGetSpacesQuery.mockReturnValue({
      data: [{ id: 'space-1', slug: 'test-space', name: 'Test Space' }],
    } as ReturnType<typeof useGetSpacesQuery>);
    mockedUseListPackagesBySpaceQuery.mockReturnValue({
      data: [],
    } as ReturnType<typeof useListPackagesBySpaceQuery>);
    mockedUseGetStandardsQuery.mockReturnValue({
      data: [],
    } as ReturnType<typeof useGetStandardsQuery>);
    mockedUseGetSkillsQuery.mockReturnValue({
      data: [],
    } as ReturnType<typeof useGetSkillsQuery>);
    mockedUseGetOnboardingStatusQuery.mockReturnValue({
      data: { hasDeployed: false },
    } as ReturnType<typeof useGetOnboardingStatusQuery>);
    mockedUseGetUsersInMyOrganizationQuery.mockReturnValue({
      data: { users: [] },
    } as ReturnType<typeof useGetUsersInMyOrganizationQuery>);
  });
  describe('renders static content', () => {
    it('displays all four step labels', () => {
      renderWithProviders(<GetStartedWithPackmindWidget />);

      expect(
        screen.getByText(/1\. create your first artifacts/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/2\. bundle them into a package/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/3\. distribute your package in your repo/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/4\. invite collaborators/i)).toBeInTheDocument();
    });

    it('displays all four CTA buttons', () => {
      renderWithProviders(<GetStartedWithPackmindWidget />);

      expect(
        screen.getByRole('button', { name: /create a standard/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create package/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /deploy with cli/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /invite team/i }),
      ).toBeInTheDocument();
    });
  });

  describe('when callbacks are provided', () => {
    describe('when Create a standard button is clicked', () => {
      it('calls onCreateArtifact callback', async () => {
        const onCreateArtifact = jest.fn();

        renderWithProviders(
          <GetStartedWithPackmindWidget onCreateArtifact={onCreateArtifact} />,
        );

        await userEvent.click(
          screen.getByRole('button', { name: /create a standard/i }),
        );

        expect(onCreateArtifact).toHaveBeenCalledTimes(1);
      });
    });

    describe('when Create package button is clicked', () => {
      it('calls onCreatePackage callback', async () => {
        const onCreatePackage = jest.fn();

        renderWithProviders(
          <GetStartedWithPackmindWidget onCreatePackage={onCreatePackage} />,
        );

        await userEvent.click(
          screen.getByRole('button', { name: /create package/i }),
        );

        expect(onCreatePackage).toHaveBeenCalledTimes(1);
      });
    });

    describe('when Deploy with CLI button is clicked', () => {
      it('calls onDeployWithCLI callback', async () => {
        const onDeployWithCLI = jest.fn();

        renderWithProviders(
          <GetStartedWithPackmindWidget onDeployWithCLI={onDeployWithCLI} />,
        );

        await userEvent.click(
          screen.getByRole('button', { name: /deploy with cli/i }),
        );

        expect(onDeployWithCLI).toHaveBeenCalledTimes(1);
      });
    });

    describe('when Invite team button is clicked', () => {
      it('calls onInviteTeam callback', async () => {
        const onInviteTeam = jest.fn();

        renderWithProviders(
          <GetStartedWithPackmindWidget onInviteTeam={onInviteTeam} />,
        );

        await userEvent.click(
          screen.getByRole('button', { name: /invite team/i }),
        );

        expect(onInviteTeam).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when callbacks are not provided', () => {
    it('navigates to standards page when Create a standard button is clicked', async () => {
      renderWithProviders(<GetStartedWithPackmindWidget />);

      await userEvent.click(
        screen.getByRole('button', { name: /create a standard/i }),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        '/org/test-org/space/test-space/standards',
      );
    });

    it('navigates to packages page when Create package button is clicked', async () => {
      renderWithProviders(<GetStartedWithPackmindWidget />);

      await userEvent.click(
        screen.getByRole('button', { name: /create package/i }),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        '/org/test-org/space/test-space/packages',
      );
    });

    it('opens modal when Deploy with CLI button is clicked', async () => {
      renderWithProviders(<GetStartedWithPackmindWidget />);

      await userEvent.click(
        screen.getByRole('button', { name: /deploy with cli/i }),
      );

      expect(mockNavigate).not.toHaveBeenCalled();
      // Modal should open - check for modal title
      expect(
        screen.getByRole('heading', { name: /deploy with cli/i }),
      ).toBeInTheDocument();
    });

    it('navigates to users settings page when Invite team button is clicked', async () => {
      renderWithProviders(<GetStartedWithPackmindWidget />);

      await userEvent.click(
        screen.getByRole('button', { name: /invite team/i }),
      );

      expect(mockNavigate).toHaveBeenCalledWith('/org/test-org/settings/users');
    });
  });

  describe('when no spaces are available', () => {
    beforeEach(() => {
      mockedUseGetSpacesQuery.mockReturnValue({
        data: [],
      } as ReturnType<typeof useGetSpacesQuery>);
    });

    describe('when Create a standard button is clicked', () => {
      it('does not navigate', async () => {
        renderWithProviders(<GetStartedWithPackmindWidget />);

        await userEvent.click(
          screen.getByRole('button', { name: /create a standard/i }),
        );

        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    describe('when Create package button is clicked', () => {
      it('does not navigate', async () => {
        renderWithProviders(<GetStartedWithPackmindWidget />);

        await userEvent.click(
          screen.getByRole('button', { name: /create package/i }),
        );

        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });
});
