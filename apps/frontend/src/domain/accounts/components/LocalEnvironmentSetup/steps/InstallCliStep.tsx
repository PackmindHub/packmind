import React, { useState } from 'react';
import { PMVStack, PMHStack, PMButton, PMText, PMBox } from '@packmind/ui';
import {
  CopiableTextarea,
  CopiableTextField,
} from '../../../../../shared/components/inputs';
import { IInstallCliStepProps, OsType } from '../types';
import {
  detectUserOs,
  buildNpmInstallCommand,
  buildCurlInstallCommand,
  formatCodeExpiresAt,
} from '../utils';
import { SectionCard, StepHeader, OsRadioSelector } from '../components';

export const InstallCliStep: React.FC<IInstallCliStepProps> = ({
  loginCode,
  isGeneratingCode,
  codeExpiresAt,
  onRegenerateCode,
}) => {
  const [selectedOs, setSelectedOs] = useState<OsType>(detectUserOs);

  const renderGuidedInstallContent = () => {
    if (isGeneratingCode) {
      return (
        <PMText as="p" color="tertiary">
          Generating install command...
        </PMText>
      );
    }

    if (!loginCode) return null;

    return (
      <>
        <PMText
          variant="small"
          color="primary"
          as="p"
          style={{
            fontWeight: 'medium',
            marginBottom: '4px',
            display: 'inline-block',
          }}
        >
          Terminal
        </PMText>
        <CopiableTextarea
          value={buildCurlInstallCommand(loginCode)}
          readOnly
          rows={3}
        />
        <PMHStack gap={2} marginTop={2}>
          <PMText variant="small" color="tertiary">
            {formatCodeExpiresAt(codeExpiresAt)}
          </PMText>
          <PMButton variant="tertiary" size="xs" onClick={onRegenerateCode}>
            Regenerate code
          </PMButton>
        </PMHStack>
      </>
    );
  };

  return (
    <PMVStack align="flex-start" gap={6} width="full" padding={4}>
      <StepHeader
        title="Install the Packmind CLI"
        description="The CLI is required to authenticate and run the MCP server locally."
      />

      <PMVStack align="flex-start" gap={2} width="full">
        <OsRadioSelector value={selectedOs} onChange={setSelectedOs} />
      </PMVStack>

      <PMVStack alignItems="flex-start" width="full">
        {selectedOs === 'macos-linux' && (
          <SectionCard
            title="Guided install"
            description="One-line install script (installs the CLI and continues automatically)."
            variant="primary"
          >
            <PMBox width="1/2">{renderGuidedInstallContent()}</PMBox>
          </SectionCard>
        )}

        <SectionCard
          title={selectedOs === 'macos-linux' ? 'Alternative' : 'Recommended'}
          description="Install via npm (most reliable across environments)."
        >
          <PMBox width="1/2">
            <CopiableTextField
              value={buildNpmInstallCommand()}
              readOnly
              label="Terminal (NPM)"
            />
          </PMBox>
        </SectionCard>
      </PMVStack>
    </PMVStack>
  );
};
