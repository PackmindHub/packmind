import { useState } from 'react';
import {
  PMVStack,
  PMHStack,
  PMBox,
  PMText,
  PMAlert,
  PMSeparator,
} from '@packmind/ui';
import { useCliLoginCode } from './LocalEnvironmentSetup/hooks/useCliLoginCode';
import {
  CopiableTextField,
  CopiableTextarea,
} from '../../../shared/components/inputs';
import {
  buildCurlInstallCommand,
  NPM_INSTALL_COMMAND,
  HOMEBREW_INSTALL_COMMAND,
  buildCliLoginCommand,
  detectUserOs,
} from './LocalEnvironmentSetup/utils';
import {
  SectionCard,
  OsRadioSelector,
} from './LocalEnvironmentSetup/components';
import type { OsType } from './LocalEnvironmentSetup/types';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

function StepHeader({
  number,
  title,
  description,
}: Readonly<{
  number: number;
  title: string;
  description?: string;
}>) {
  return (
    <PMHStack gap={3} align="start">
      <PMText
        fontSize="xs"
        fontWeight="bold"
        bg="background.tertiary"
        borderRadius="full"
        minWidth="24px"
        height="24px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        {number}
      </PMText>
      <PMVStack gap={0} align="start">
        <PMText fontWeight="semibold">{title}</PMText>
        {description && (
          <PMText color="secondary" fontSize="xs">
            {description}
          </PMText>
        )}
      </PMVStack>
    </PMHStack>
  );
}

export function OnboardingBuildCliSection() {
  const { loginCode } = useCliLoginCode();
  const curlCommand = buildCurlInstallCommand(loginCode ?? '');
  const loginCommand = buildCliLoginCommand();
  const analytics = useAnalytics();
  const [selectedOs, setSelectedOs] = useState<OsType>(detectUserOs);

  return (
    <PMVStack
      gap={6}
      align="stretch"
      flex={1}
      data-testid="OnboardingBuild.CLISection"
    >
      {/* Step 1: Install */}
      <PMVStack gap={4} align="stretch">
        <StepHeader number={1} title="Install the CLI" />
        <PMVStack gap={4} align="stretch" paddingStart={9}>
          <OsRadioSelector value={selectedOs} onChange={setSelectedOs} />

          {selectedOs === 'macos-linux' ? (
            <>
              <SectionCard
                title="Guided install"
                description="One-line install script (installs the CLI and logs you in automatically)."
                variant="primary"
              >
                <CopiableTextarea
                  value={curlCommand}
                  readOnly
                  rows={3}
                  data-testid="OnboardingBuild.InstallScriptContent"
                  onCopy={() =>
                    analytics.track('post_signup_onboarding_field_copied', {
                      field: 'installSh',
                    })
                  }
                />
              </SectionCard>

              <SectionCard
                title="Alternative"
                description="Other installation methods."
              >
                <PMText
                  variant="small"
                  color="primary"
                  as="p"
                  fontWeight="medium"
                  marginBottom={1}
                >
                  Terminal (Homebrew)
                </PMText>
                <CopiableTextarea
                  value={`${HOMEBREW_INSTALL_COMMAND}\n${loginCommand}`}
                  readOnly
                  rows={3}
                  data-testid="OnboardingBuild.InstallHomebrewContent"
                  onCopy={() =>
                    analytics.track('post_signup_onboarding_field_copied', {
                      field: 'installHomebrew',
                    })
                  }
                />
                <PMText
                  variant="small"
                  color="primary"
                  as="p"
                  fontWeight="medium"
                  marginBottom={1}
                  marginTop={3}
                >
                  Terminal (NPM)
                </PMText>
                <CopiableTextarea
                  value={`${NPM_INSTALL_COMMAND}\n${loginCommand}`}
                  readOnly
                  rows={2}
                  onCopy={() =>
                    analytics.track('post_signup_onboarding_field_copied', {
                      field: 'installNpm',
                    })
                  }
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
            </>
          ) : (
            <SectionCard title="Recommended: NPM" variant="primary">
              <CopiableTextarea
                value={`${NPM_INSTALL_COMMAND}\n${loginCommand}`}
                readOnly
                rows={2}
                onCopy={() =>
                  analytics.track('post_signup_onboarding_field_copied', {
                    field: 'installNpm',
                  })
                }
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

      <PMSeparator />

      {/* Step 2: Initialize */}
      <PMVStack gap={4} align="stretch">
        <StepHeader
          number={2}
          title="Initialize your project"
          description="Add Packmind base artifacts to your codebase"
        />
        <PMBox paddingStart={9}>
          <CopiableTextField
            value="packmind-cli init"
            readOnly
            data-testid="OnboardingBuild.InitializeContent"
            onCopy={() =>
              analytics.track('post_signup_onboarding_field_copied', {
                field: 'cliInit',
              })
            }
          />
        </PMBox>
      </PMVStack>

      <PMSeparator />

      {/* Step 3: Start analysis */}
      <PMVStack gap={4} align="stretch">
        <StepHeader
          number={3}
          title="Start analysis"
          description="Run the onboarding command with your AI agent"
        />
        <PMBox paddingStart={9}>
          <CopiableTextField
            value="/packmind-onboard"
            readOnly
            data-testid="OnboardingBuild.StartAnalysisContent"
            onCopy={() =>
              analytics.track('post_signup_onboarding_field_copied', {
                field: 'cliStartAnalysis',
              })
            }
          />
        </PMBox>
      </PMVStack>
    </PMVStack>
  );
}
