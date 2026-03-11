import { useState } from 'react';
import { PMVStack, PMHeading, PMText, PMCard, PMAlert } from '@packmind/ui';
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

export function OnboardingBuildCliSection() {
  const { loginCode } = useCliLoginCode();
  const curlCommand = buildCurlInstallCommand(loginCode ?? '');
  const loginCommand = buildCliLoginCommand();
  const analytics = useAnalytics();
  const [selectedOs, setSelectedOs] = useState<OsType>(detectUserOs);

  return (
    <PMCard.Root
      flex={1}
      borderWidth="1px"
      borderColor="border.secondary"
      data-testid="OnboardingBuild.CLICard"
    >
      <PMCard.Body padding={6}>
        <PMVStack gap={6} align="stretch">
          <PMVStack gap={2} align="start">
            <PMHeading level="h3">With CLI</PMHeading>
            <PMText color="secondary" fontSize="sm">
              For humans and AI agents alike
            </PMText>
          </PMVStack>

          {/* Install section */}
          <PMVStack gap={4} align="stretch">
            <PMText fontWeight="semibold">Install</PMText>
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
                    style={{
                      fontWeight: 'medium',
                      marginBottom: '4px',
                      display: 'inline-block',
                    }}
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
                <CopiableTextField
                  value={NPM_INSTALL_COMMAND}
                  readOnly
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
                <CopiableTextField value={loginCommand} readOnly />
              </SectionCard>
            )}
          </PMVStack>

          {/* Initialize section */}
          <PMVStack gap={2} align="stretch">
            <PMVStack gap={0} align="start">
              <PMText fontWeight="semibold">Initialize</PMText>
              <PMText color="secondary" fontSize="xs">
                Add Packmind base artifacts to your codebase for artifacts
                creation
              </PMText>
            </PMVStack>
            <CopiableTextField
              value="packmind init"
              readOnly
              data-testid="OnboardingBuild.InitializeContent"
              onCopy={() =>
                analytics.track('post_signup_onboarding_field_copied', {
                  field: 'cliInit',
                })
              }
            />
          </PMVStack>

          {/* Start analysis section */}
          <PMVStack gap={2} align="stretch">
            <PMVStack gap={0} align="start">
              <PMText fontWeight="semibold">Start analysis</PMText>
              <PMText color="secondary" fontSize="xs">
                Run the onboarding command with your agent
              </PMText>
            </PMVStack>
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
          </PMVStack>
        </PMVStack>
      </PMCard.Body>
    </PMCard.Root>
  );
}
