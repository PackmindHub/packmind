import { PMVStack, PMHeading, PMText, PMCard, PMTabs } from '@packmind/ui';
import { useCliLoginCode } from './LocalEnvironmentSetup/hooks/useCliLoginCode';
import {
  CopiableTextField,
  CopiableTextarea,
} from '../../../shared/components/inputs';
import {
  buildCurlInstallCommand,
  NPM_INSTALL_COMMAND,
  buildCliLoginCommand,
} from './LocalEnvironmentSetup/utils';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

export function OnboardingBuildCliSection() {
  const { loginCode } = useCliLoginCode();
  const curlCommand = buildCurlInstallCommand(loginCode ?? '');
  const loginCommand = buildCliLoginCommand();
  const analytics = useAnalytics();

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

          {/* Install section with tabs */}
          <PMVStack gap={2} align="stretch">
            <PMText fontWeight="semibold">Install</PMText>
            <PMTabs
              defaultValue="script"
              tabs={[
                {
                  value: 'script',
                  triggerLabel: 'Script (Mac/Linux)',
                  content: (
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
                  ),
                },
                {
                  value: 'npm',
                  triggerLabel: 'NPM (all OS)',
                  content: (
                    <PMVStack
                      gap={3}
                      align="stretch"
                      data-testid="OnboardingBuild.InstallNPMContent"
                    >
                      <PMText color="secondary" fontSize="xs" marginTop={4}>
                        Requires Node.js v22 or higher
                      </PMText>
                      <CopiableTextField
                        value={NPM_INSTALL_COMMAND}
                        readOnly
                        onCopy={() =>
                          analytics.track(
                            'post_signup_onboarding_field_copied',
                            {
                              field: 'installNpm',
                            },
                          )
                        }
                      />
                      <CopiableTextField value={loginCommand} readOnly />
                    </PMVStack>
                  ),
                },
              ]}
              data-testid="OnboardingBuild.InstallTabs"
            />
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
              value="packmind-cli init"
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
