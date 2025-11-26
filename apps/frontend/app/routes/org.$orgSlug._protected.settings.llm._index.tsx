import { redirect, type LoaderFunctionArgs } from 'react-router';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  isFeatureFlagEnabled,
  LLM_CONFIGURATION_FEATURE_KEY,
  PMPage,
  pmToaster,
} from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { LLMConfigurationPage } from '../../src/domain/llm/components';
import { queryClient } from '../../src/shared/data/queryClient';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await queryClient.ensureQueryData(getMeQueryOptions());

  const userEmail = me?.authenticated ? me.user.email : null;
  const isLLMConfigurationEnabled = isFeatureFlagEnabled({
    featureKeys: [LLM_CONFIGURATION_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail,
  });

  if (!isLLMConfigurationEnabled) {
    throw redirect(`/org/${params.orgSlug}/settings`);
  }
}

export default function SettingsLLMRouteModule() {
  const { organization } = useAuthContext();

  if (!organization) {
    return null;
  }

  return (
    <PMPage title="AI Provider" subtitle="Configure your AI provider settings">
      <LLMConfigurationPage organizationId={organization.id} />
    </PMPage>
  );
}
