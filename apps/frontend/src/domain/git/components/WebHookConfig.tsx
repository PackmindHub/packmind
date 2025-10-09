import React from 'react';
import { PMText, PMVStack, PMField, PMBox, PMSpinner } from '@packmind/ui';
import { CopiableTextarea } from '../../../shared/components/inputs';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useGetGitWebhooksQuery } from '../../../domain/git/api/queries/GitQueries';
import { OrganizationId } from '@packmind/shared';

export const WebHookConfig: React.FunctionComponent<{
  providerVendor: string;
}> = ({ providerVendor }) => {
  const { organization } = useAuthContext();
  if (!organization) {
    return null;
  }

  return (
    <PMVStack alignItems="stretch" gap={4}>
      <PMText as="p" color="secondary">
        Configure webhooks for your Git repositories to automatically sync
        recipes and standards when code changes are pushed.
      </PMText>
      <ProviderWebHookConfig
        providerVendor={providerVendor}
        organizationId={organization.id}
      ></ProviderWebHookConfig>
    </PMVStack>
  );
};

const ProviderWebHookConfig: React.FunctionComponent<{
  organizationId: OrganizationId;
  providerVendor: string;
}> = ({ organizationId, providerVendor }) => {
  const { data } = useGetGitWebhooksQuery(organizationId);

  if (!data) {
    return (
      <PMBox textAlign="center" py={8}>
        <PMSpinner size="lg" />
        <PMText mt={4}>Loading web hooks urls...</PMText>
      </PMBox>
    );
  }

  if (providerVendor === 'github') {
    return (
      <PMBox>
        <PMField.Root>
          <PMField.Label>GitHub Webhook URL</PMField.Label>
          <PMField.HelperText>
            Add this URL to your GitHub repository webhook settings. Set content
            type to "application/json" and select "Push events".
          </PMField.HelperText>
          <CopiableTextarea
            value={data.github}
            readOnly
            rows={2}
            data-testid="github-webhook-url"
            width="full"
          />
        </PMField.Root>
      </PMBox>
    );
  }

  if (providerVendor === 'gitlab') {
    return (
      <PMBox>
        <PMField.Root>
          <PMField.Label>GitLab Webhook URL</PMField.Label>
          <PMField.HelperText>
            Add this URL to your GitLab project webhook settings. Enable "Push
            events" trigger.
          </PMField.HelperText>
          <CopiableTextarea
            value={data.gitlab}
            readOnly
            rows={2}
            data-testid="gitlab-webhook-url"
            width="full"
          />
        </PMField.Root>
      </PMBox>
    );
  }

  return null;
};
