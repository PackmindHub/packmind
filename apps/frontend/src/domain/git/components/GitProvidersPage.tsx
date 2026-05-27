import React from 'react';
import { PMTabs } from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import { GitProvidersList } from './GitProvidersList';
import { GitHubAppTab } from './GitHubAppTab';
import { useAuthContext } from '../../accounts/hooks';

interface GitProvidersPageProps {
  organizationId: OrganizationId;
  defaultTab?: string;
}

export const GitProvidersPage: React.FC<GitProvidersPageProps> = ({
  organizationId,
  defaultTab,
}) => {
  const { organization } = useAuthContext();
  const isAdmin = organization?.role === 'admin';

  const tabs = [
    {
      value: 'pat',
      triggerLabel: 'Personal access token',
      content: <GitProvidersList organizationId={organizationId} />,
    },
    {
      value: 'github-app',
      triggerLabel: 'GitHub App',
      content: <GitHubAppTab isAdmin={isAdmin} />,
    },
  ];

  return <PMTabs defaultValue={defaultTab ?? 'pat'} tabs={tabs} />;
};
