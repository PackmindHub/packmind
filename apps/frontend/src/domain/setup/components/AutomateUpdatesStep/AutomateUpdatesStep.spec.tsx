import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { UIProvider } from '@packmind/ui';
import { AutomateUpdatesStep } from './AutomateUpdatesStep';
import { useApiKey } from '../../../accounts/components/LocalEnvironmentSetup/hooks';

jest.mock('../../../accounts/components/LocalEnvironmentSetup/hooks', () => ({
  useApiKey: jest.fn(),
}));

const mockedUseApiKey = useApiKey as jest.MockedFunction<typeof useApiKey>;

const buildUseApiKeyReturn = (hasExistingKey: boolean) =>
  ({
    hasExistingKey,
    existingKeyExpiresAt: undefined,
    generatedKey: undefined,
    generatedKeyExpiresAt: undefined,
    isGenerating: false,
    isSuccess: false,
    isError: false,
    error: null,
    showConfirmGenerate: false,
    handleGenerate: jest.fn(),
    cancelGenerate: jest.fn(),
    getGenerateButtonLabel: () => 'Generate API Key',
  }) as ReturnType<typeof useApiKey>;

const CliSetupStub: React.FC = () => {
  const location = useLocation();
  return (
    <div
      data-testid="cli-setup-stub"
      data-pathname={location.pathname}
      data-hash={location.hash}
    >
      CLI Setup
    </div>
  );
};

const renderStep = () =>
  render(
    <UIProvider>
      <MemoryRouter initialEntries={['/org/acme/setup/auto-update']}>
        <Routes>
          <Route
            path="/org/:orgSlug/setup/auto-update"
            element={<AutomateUpdatesStep />}
          />
          <Route path="/org/:orgSlug/setup/cli" element={<CliSetupStub />} />
        </Routes>
      </MemoryRouter>
    </UIProvider>,
  );

const getActivePanel = (): HTMLElement => {
  const panels = screen.getAllByRole('tabpanel');
  const active = panels.find(
    (panel) => panel.getAttribute('data-state') === 'open',
  );
  if (!active) {
    throw new Error('No open tab panel found');
  }
  return active;
};

describe('AutomateUpdatesStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('shows the GitHub workflow with the default cron when the user has an API key', () => {
    mockedUseApiKey.mockReturnValue(buildUseApiKeyReturn(true));
    renderStep();

    const panel = getActivePanel();
    expect(
      within(panel).queryByText(/you need an api key first/i),
    ).not.toBeInTheDocument();

    const workflowTextarea = within(panel).getByDisplayValue(
      /name: Nightly Packmind update/,
    ) as HTMLTextAreaElement;
    expect(workflowTextarea.value).toContain('cron: "0 2 * * 1-5"');
  });

  it('prompts the user to generate an API key when none exists and navigates to CLI Setup', async () => {
    mockedUseApiKey.mockReturnValue(buildUseApiKeyReturn(false));
    renderStep();

    const panel = getActivePanel();
    expect(
      within(panel).getByText(/you need an api key first/i),
    ).toBeInTheDocument();

    const button = within(panel).getByRole('button', {
      name: /go to cli setup/i,
    });
    await userEvent.click(button);

    const stub = await screen.findByTestId('cli-setup-stub');
    expect(stub).toHaveAttribute('data-pathname', '/org/acme/setup/cli');
    expect(stub).toHaveAttribute('data-hash', '#api-key');
  });

  it('switches to GitLab and tells the user about both required CI variables', async () => {
    mockedUseApiKey.mockReturnValue(buildUseApiKeyReturn(true));
    renderStep();

    const gitlabTab = screen.getByRole('tab', { name: /gitlab ci/i });
    await userEvent.click(gitlabTab);

    const panel = getActivePanel();
    expect(
      within(panel).getByText(
        /set PACKMIND_API_KEY_V3 and PACKMIND_BOT_TOKEN in Settings → CI\/CD → Variables/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/cron expression to paste in gitlab/i),
    ).toBeInTheDocument();
  });

  it('tells the user about the GitHub Actions secret on the GitHub panel', () => {
    mockedUseApiKey.mockReturnValue(buildUseApiKeyReturn(true));
    renderStep();

    const panel = getActivePanel();
    expect(
      within(panel).getByText(
        /set PACKMIND_API_KEY_V3 in Settings → Secrets and variables → Actions/i,
      ),
    ).toBeInTheDocument();
  });

  it('updates the rendered cron when switching schedule preset on GitHub', async () => {
    mockedUseApiKey.mockReturnValue(buildUseApiKeyReturn(true));
    renderStep();

    const panel = getActivePanel();
    const mondayPreset = within(panel).getByText(/every monday at 9am utc/i);
    await userEvent.click(mondayPreset);

    const updatedTextarea = within(panel).getByDisplayValue(
      /name: Nightly Packmind update/,
    ) as HTMLTextAreaElement;
    expect(updatedTextarea.value).toContain('cron: "0 9 * * 1"');
  });

  it('persists the chosen provider in localStorage and restores it on remount', async () => {
    mockedUseApiKey.mockReturnValue(buildUseApiKeyReturn(true));
    const { unmount } = renderStep();

    const gitlabTab = screen.getByRole('tab', { name: /gitlab ci/i });
    await userEvent.click(gitlabTab);

    expect(
      window.localStorage.getItem('packmind.autoUpdate.lastProvider'),
    ).toBe('gitlab');

    unmount();
    renderStep();

    const restoredTab = screen.getByRole('tab', { name: /gitlab ci/i });
    expect(restoredTab).toHaveAttribute('aria-selected', 'true');
  });

  it('shows an invalid-cron error when typing a malformed custom expression', async () => {
    mockedUseApiKey.mockReturnValue(buildUseApiKeyReturn(true));
    renderStep();

    const panel = getActivePanel();
    const customRadio = within(panel).getByText('Custom');
    await userEvent.click(customRadio);

    const input = within(panel).getByLabelText(/custom cron expression/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'not-a-cron');

    expect(
      await within(panel).findByText(/invalid cron expression/i),
    ).toBeInTheDocument();
  });

  it('renders the docs link to the public guide on the active panel', () => {
    mockedUseApiKey.mockReturnValue(buildUseApiKeyReturn(true));
    renderStep();

    const panel = getActivePanel();
    const link = within(panel).getByRole('link', {
      name: /see the full guide/i,
    });
    expect(link).toHaveAttribute(
      'href',
      'https://docs.packmind.com/playbook-maintenance/auto-update-artifacts',
    );
  });
});
