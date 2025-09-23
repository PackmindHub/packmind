import React from 'react';
import { PMText, PMVStack, PMField, PMBox } from '@packmind/ui';
import { CopiableTextarea } from '../../../shared/components/inputs';
import { getEnvVar } from '../../../shared/utils/getEnvVar';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

export const WebHookConfig: React.FunctionComponent<{
  providerVendor: string;
}> = ({ providerVendor }) => {
  const { organization } = useAuthContext();

  if (!organization) {
    return null;
  }

  const hostname = getEnvVar(
    'VITE_PACKMIND_API_BASE_URL',
    'https://v3.packmind.com',
  ).replace('/api', '');

  const githubWebhookUrl = `${hostname}/api/v0/${organization.id}/hooks/github`;
  const gitlabWebhookUrl = `${hostname}/api/v0/${organization.id}/hooks/gitlab`;

  return (
    <PMBox
      border={'solid 1px'}
      borderColor="border.tertiary"
      p={4}
      borderRadius="md"
    >
      <PMVStack width="100%" alignItems="stretch" gap={4}>
        <PMText as="p" color="secondary">
          Configure webhooks for your Git repositories to automatically sync
          recipes and standards when code changes are pushed.
        </PMText>
        {providerVendor === 'github' && (
          <PMBox>
            <PMField.Root>
              <PMField.Label>GitHub Webhook URL</PMField.Label>
              <PMField.HelperText>
                Add this URL to your GitHub repository webhook settings. Set
                content type to "application/json" and select "Push events".
              </PMField.HelperText>
              <CopiableTextarea
                value={githubWebhookUrl}
                readOnly
                rows={2}
                data-testid="github-webhook-url"
                width="full"
              />
            </PMField.Root>
          </PMBox>
        )}

        {providerVendor === 'gitlab' && (
          <PMBox>
            <PMField.Root>
              <PMField.Label>GitLab Webhook URL</PMField.Label>
              <PMField.HelperText>
                Add this URL to your GitLab project webhook settings. Enable
                "Push events" trigger.
              </PMField.HelperText>
              <CopiableTextarea
                value={gitlabWebhookUrl}
                readOnly
                rows={2}
                data-testid="gitlab-webhook-url"
                width="full"
              />
            </PMField.Root>
          </PMBox>
        )}
      </PMVStack>
    </PMBox>
  );
};
