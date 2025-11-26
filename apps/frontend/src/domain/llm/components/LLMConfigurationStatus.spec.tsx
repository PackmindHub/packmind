import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  LLMConfigurationStatus,
  LLMConfigurationStatusType,
} from './LLMConfigurationStatus';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

describe('LLMConfigurationStatus', () => {
  describe('when status is loading', () => {
    it('renders loading spinner with message', () => {
      renderWithProvider(<LLMConfigurationStatus status="loading" />);

      expect(
        screen.getByText('Checking connection status...'),
      ).toBeInTheDocument();
    });
  });

  describe('when status is connected', () => {
    it('renders success alert with provider name', () => {
      renderWithProvider(
        <LLMConfigurationStatus status="connected" providerName="OpenAI" />,
      );

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(
        screen.getByText(/Successfully connected to OpenAI/),
      ).toBeInTheDocument();
    });

    it('renders success alert with provider name and model', () => {
      renderWithProvider(
        <LLMConfigurationStatus
          status="connected"
          providerName="OpenAI"
          model="gpt-4"
        />,
      );

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(
        screen.getByText(/Successfully connected to OpenAI using model gpt-4/),
      ).toBeInTheDocument();
    });
  });

  describe('when status is failed', () => {
    it('renders error alert with default message', () => {
      renderWithProvider(<LLMConfigurationStatus status="failed" />);

      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
      expect(
        screen.getByText('Failed to connect to the AI provider'),
      ).toBeInTheDocument();
    });

    it('renders error alert with custom error message', () => {
      renderWithProvider(
        <LLMConfigurationStatus
          status="failed"
          errorMessage="Invalid API key"
        />,
      );

      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
      expect(screen.getByText('Invalid API key')).toBeInTheDocument();
    });
  });

  describe('when status is not_configured', () => {
    it('renders info alert with configuration prompt', () => {
      renderWithProvider(<LLMConfigurationStatus status="not_configured" />);

      expect(screen.getByText('No Configuration')).toBeInTheDocument();
      expect(
        screen.getByText(/No AI provider has been configured yet/),
      ).toBeInTheDocument();
    });
  });
});
