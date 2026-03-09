import React, { useState } from 'react';
import {
  PMVStack,
  PMHStack,
  PMButton,
  PMText,
  PMBox,
  PMAlert,
} from '@packmind/ui';
import { CopiableTextarea } from '../../../../../shared/components/inputs';
import { IInstallCliStepProps, OsType } from '../types';
import {
  detectUserOs,
  buildNpmInstallCommand,
  buildCurlInstallCommand,
  buildHomebrewInstallCommand,
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
          rows={4}
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
        description="The CLI is required to authenticate and communicate with Packmind."
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
            <PMBox width="full">{renderGuidedInstallContent()}</PMBox>
          </SectionCard>
        )}

        {selectedOs === 'macos-linux' ? (
          <SectionCard
            title="Alternative"
            description="Other installation methods."
          >
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
              Terminal (Homebrew)
            </PMText>
            <CopiableTextarea
              value={buildHomebrewInstallCommand()}
              readOnly
              rows={2}
            />
            <PMText
              variant="small"
              color="primary"
              as="p"
              style={{
                fontWeight: 'medium',
                marginBottom: '4px',
                marginTop: '12px',
                display: 'inline-block',
              }}
            >
              Terminal (NPM)
            </PMText>
            <CopiableTextarea
              value={buildNpmInstallCommand()}
              readOnly
              rows={1}
            />
            <PMAlert.Root status="info">
              <PMAlert.Indicator />
              <PMAlert.Content>
                <PMAlert.Description>
                  Requires Node.js 22 or higher.
                </PMAlert.Description>
              </PMAlert.Content>
            </PMAlert.Root>
          </SectionCard>
        ) : (
          <SectionCard title="Recommended: NPM" variant="primary">
            <CopiableTextarea
              value={buildNpmInstallCommand()}
              readOnly
              rows={1}
            />
            <PMAlert.Root status="info">
              <PMAlert.Indicator />
              <PMAlert.Content>
                <PMAlert.Description>
                  Requires Node.js 22 or higher.
                </PMAlert.Description>
              </PMAlert.Content>
            </PMAlert.Root>
          </SectionCard>
        )}
      </PMVStack>
    </PMVStack>
  );
};
