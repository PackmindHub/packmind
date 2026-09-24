import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { LLMConfigurationDTO, LLMProvider } from '@packmind/types';
import { LLMConfigurationDisplay } from './LLMConfigurationDisplay';

const baseConfiguration: LLMConfigurationDTO = {
  provider: LLMProvider.OPENAI,
  model: 'gpt-4',
  fastestModel: 'gpt-4-mini',
};

const renderDisplay = (configuration: LLMConfigurationDTO) =>
  render(
    <UIProvider>
      <LLMConfigurationDisplay
        configuration={configuration}
        status="failed"
        onEdit={vi.fn()}
      />
    </UIProvider>,
  );

describe('LLMConfigurationDisplay', () => {
  describe('when the stored API key cannot be decrypted', () => {
    it('asks the admin to enter the key again', () => {
      renderDisplay({ ...baseConfiguration, secretsUnreadable: true });

      expect(
        screen.getByText("Packmind can't read the stored API key"),
      ).toBeInTheDocument();
    });
  });

  describe('when the stored API key is readable', () => {
    it('does not show the unreadable key warning', () => {
      renderDisplay(baseConfiguration);

      expect(
        screen.queryByTestId('llm-configuration-secrets-unreadable'),
      ).not.toBeInTheDocument();
    });
  });
});
