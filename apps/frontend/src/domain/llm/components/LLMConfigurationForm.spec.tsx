import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { LLMConfigurationForm } from './LLMConfigurationForm';
import {
  OrganizationId,
  LLMProvider,
  TestLLMConnectionResponse,
  LLMConfigurationDTO,
  ProviderMetadata,
  LLM_PROVIDER_METADATA,
} from '@packmind/types';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

// Get all providers for tests (simulating OSS mode without Packmind)
const mockProviders: ProviderMetadata[] = Object.values(
  LLM_PROVIDER_METADATA,
).filter((provider) => provider.id !== LLMProvider.PACKMIND);

// All providers including Packmind (cloud mode)
const mockAllProviders: ProviderMetadata[] = Object.values(
  LLM_PROVIDER_METADATA,
);

describe('LLMConfigurationForm', () => {
  const mockOrganizationId = 'org-123' as OrganizationId;
  const mockOnTestConnection = jest.fn();
  const mockOnSaveConfiguration = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('provider selection', () => {
    it('renders provider selection dropdown with first provider as default', () => {
      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      expect(screen.getByTestId('provider-select')).toBeInTheDocument();
      // In OSS mode, first provider is OpenAI (Packmind is filtered out)
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('renders Packmind as default when included in providers', () => {
      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockAllProviders}
        />,
      );

      expect(screen.getByTestId('provider-select')).toBeInTheDocument();
      expect(screen.getByText('Packmind (SaaS)')).toBeInTheDocument();
    });

    it('shows provider options in dropdown', () => {
      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Anthropic Claude')).toBeInTheDocument();
      expect(screen.getByText('Google Gemini')).toBeInTheDocument();
      expect(screen.getByText('Azure OpenAI')).toBeInTheDocument();
      expect(screen.getByText('OpenAI-Compatible')).toBeInTheDocument();
    });

    it('shows form fields when provider is selected', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      await waitFor(() => {
        expect(screen.getByLabelText(/API Key/)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Model$/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Fast Model/)).toBeInTheDocument();
      });
    });

    it('changes form fields when provider is changed', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');

      // First select OpenAI
      await user.selectOptions(select, LLMProvider.OPENAI);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
      });

      // Then select Azure OpenAI
      await user.selectOptions(select, LLMProvider.AZURE_OPENAI);
      await waitFor(() => {
        expect(screen.getByLabelText(/Endpoint URL/)).toBeInTheDocument();
        expect(screen.getByLabelText(/API Version/)).toBeInTheDocument();
      });
    });
  });

  describe('form validation', () => {
    it('shows error when required field is empty on test connection', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('API Key is required')).toBeInTheDocument();
      });
      expect(mockOnTestConnection).not.toHaveBeenCalled();
    });

    it('clears error when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('API Key is required')).toBeInTheDocument();
      });

      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      await user.type(apiKeyInput, 'sk-test');

      await waitFor(() => {
        expect(
          screen.queryByText('API Key is required'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('test connection', () => {
    it('calls onTestConnection with correct config when valid', async () => {
      const user = userEvent.setup();
      const mockResponse: TestLLMConnectionResponse = {
        provider: LLMProvider.OPENAI,
        standardModel: { model: 'gpt-4', success: true },
        overallSuccess: true,
      };
      mockOnTestConnection.mockResolvedValue(mockResponse);

      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      await user.type(apiKeyInput, 'sk-test-key-123');

      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(mockOnTestConnection).toHaveBeenCalledWith({
          provider: LLMProvider.OPENAI,
          apiKey: 'sk-test-key-123',
          model: 'gpt-5.1',
          fastestModel: 'gpt-4.1-mini',
        });
      });
    });

    it('shows success alert when connection succeeds', async () => {
      const user = userEvent.setup();
      const mockResponse: TestLLMConnectionResponse = {
        provider: LLMProvider.OPENAI,
        standardModel: { model: 'gpt-4', success: true },
        overallSuccess: true,
      };
      mockOnTestConnection.mockResolvedValue(mockResponse);

      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      await user.type(apiKeyInput, 'sk-test-key-123');

      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Successful')).toBeInTheDocument();
      });
    });

    it('shows error alert when connection fails', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockRejectedValue(new Error('Invalid API key'));

      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      await user.type(apiKeyInput, 'sk-invalid-key');

      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Test Failed')).toBeInTheDocument();
        expect(screen.getByText('Invalid API key')).toBeInTheDocument();
      });
    });

    it('displays user-friendly error message from backend', async () => {
      const user = userEvent.setup();
      // Backend now extracts and returns clean error messages
      const cleanError = 'API key not valid. Please pass a valid API key.';
      const mockResponse: TestLLMConnectionResponse = {
        provider: LLMProvider.GEMINI,
        standardModel: {
          model: 'gemini-3-pro-preview',
          success: false,
          error: { message: cleanError },
        },
        overallSuccess: false,
      };
      mockOnTestConnection.mockResolvedValue(mockResponse);

      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.GEMINI);

      const apiKeyInput = screen.getByPlaceholderText('AIza...');
      await user.type(apiKeyInput, 'invalid-key');

      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(
          screen.getByText('Partial Connection Issues'),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/API key not valid\. Please pass a valid API key\./),
        ).toBeInTheDocument();
      });
    });

    it('shows testing state while connection is being tested', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: TestLLMConnectionResponse) => void;
      const pendingPromise = new Promise<TestLLMConnectionResponse>(
        (resolve) => {
          resolvePromise = resolve;
        },
      );
      mockOnTestConnection.mockReturnValue(pendingPromise);

      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      await user.type(apiKeyInput, 'sk-test-key');

      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Testing...')).toBeInTheDocument();
      });

      // Resolve the promise to clean up
      resolvePromise!({
        provider: LLMProvider.OPENAI,
        standardModel: { model: 'gpt-4', success: true },
        overallSuccess: true,
      });
    });
  });

  describe('save button', () => {
    it('disables save button until test connection succeeds', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const saveButton = screen.getByTestId('save-configuration-button');
      expect(saveButton).toBeDisabled();
    });

    it('shows tooltip on disabled save button when test has not been made', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const saveButton = screen.getByTestId('save-configuration-button');
      await user.hover(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText('Test connection before saving'),
        ).toBeInTheDocument();
      });
    });

    it('enables save button after successful test connection', async () => {
      const user = userEvent.setup();
      const mockResponse: TestLLMConnectionResponse = {
        provider: LLMProvider.OPENAI,
        standardModel: { model: 'gpt-4', success: true },
        overallSuccess: true,
      };
      mockOnTestConnection.mockResolvedValue(mockResponse);

      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      await user.type(apiKeyInput, 'sk-test-key-123');

      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Successful')).toBeInTheDocument();
      });

      const saveButton = screen.getByTestId('save-configuration-button');
      expect(saveButton).toBeEnabled();
    });

    it('calls onSaveConfiguration with correct config after successful test', async () => {
      const user = userEvent.setup();
      const mockResponse: TestLLMConnectionResponse = {
        provider: LLMProvider.OPENAI,
        standardModel: { model: 'gpt-4', success: true },
        overallSuccess: true,
      };
      mockOnTestConnection.mockResolvedValue(mockResponse);
      mockOnSaveConfiguration.mockResolvedValue(undefined);

      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      await user.type(apiKeyInput, 'sk-test-key-123');

      // First test connection
      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Successful')).toBeInTheDocument();
      });

      // Then save
      const saveButton = screen.getByTestId('save-configuration-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSaveConfiguration).toHaveBeenCalledWith({
          provider: LLMProvider.OPENAI,
          apiKey: 'sk-test-key-123',
          model: 'gpt-5.1',
          fastestModel: 'gpt-4.1-mini',
        });
      });
    });

    it('calls onSaveSuccess after successful save', async () => {
      const user = userEvent.setup();
      const mockResponse: TestLLMConnectionResponse = {
        provider: LLMProvider.OPENAI,
        standardModel: { model: 'gpt-4', success: true },
        overallSuccess: true,
      };
      mockOnTestConnection.mockResolvedValue(mockResponse);
      mockOnSaveConfiguration.mockResolvedValue(undefined);
      const mockOnSaveSuccess = jest.fn();

      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
          onSaveSuccess={mockOnSaveSuccess}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      await user.type(apiKeyInput, 'sk-test-key-123');

      // First test connection
      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Successful')).toBeInTheDocument();
      });

      // Then save
      const saveButton = screen.getByTestId('save-configuration-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSaveSuccess).toHaveBeenCalled();
      });
    });

    it('shows confirmation dialog when existing configuration exists', async () => {
      const user = userEvent.setup();
      const mockResponse: TestLLMConnectionResponse = {
        provider: LLMProvider.OPENAI,
        standardModel: { model: 'gpt-4', success: true },
        overallSuccess: true,
      };
      mockOnTestConnection.mockResolvedValue(mockResponse);

      const existingConfig: LLMConfigurationDTO = {
        provider: LLMProvider.OPENAI,
        model: 'gpt-4',
        fastestModel: 'gpt-4-mini',
        configuredAt: new Date(),
      };

      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          existingConfiguration={existingConfig}
          providers={mockProviders}
        />,
      );

      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      await user.type(apiKeyInput, 'sk-test-key-123');

      // First test connection
      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Successful')).toBeInTheDocument();
      });

      // Then try to save
      const saveButton = screen.getByTestId('save-configuration-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Overwrite Configuration')).toBeInTheDocument();
      });
    });

    it('calls onSaveSuccess after confirming overwrite dialog', async () => {
      const user = userEvent.setup();
      const mockResponse: TestLLMConnectionResponse = {
        provider: LLMProvider.OPENAI,
        standardModel: { model: 'gpt-4', success: true },
        overallSuccess: true,
      };
      mockOnTestConnection.mockResolvedValue(mockResponse);
      mockOnSaveConfiguration.mockResolvedValue(undefined);
      const mockOnSaveSuccess = jest.fn();

      const existingConfig: LLMConfigurationDTO = {
        provider: LLMProvider.OPENAI,
        model: 'gpt-4',
        fastestModel: 'gpt-4-mini',
        configuredAt: new Date(),
      };

      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          existingConfiguration={existingConfig}
          providers={mockProviders}
          onSaveSuccess={mockOnSaveSuccess}
        />,
      );

      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      await user.type(apiKeyInput, 'sk-test-key-123');

      // First test connection
      const testButton = screen.getByTestId('test-connection-button');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Successful')).toBeInTheDocument();
      });

      // Click save to open dialog
      const saveButton = screen.getByTestId('save-configuration-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Overwrite Configuration')).toBeInTheDocument();
      });

      // Confirm overwrite
      const confirmButton = screen.getByRole('button', { name: 'Overwrite' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnSaveSuccess).toHaveBeenCalled();
      });
    });

    it('disables save button when isSaving is true', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <LLMConfigurationForm
          organizationId={mockOrganizationId}
          onTestConnection={mockOnTestConnection}
          onSaveConfiguration={mockOnSaveConfiguration}
          providers={mockProviders}
          isSaving={true}
        />,
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, LLMProvider.OPENAI);

      const saveButton = screen.getByTestId('save-configuration-button');
      expect(saveButton).toBeDisabled();
    });
  });
});
