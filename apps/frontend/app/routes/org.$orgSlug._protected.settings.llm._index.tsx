import { PMPage } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { LLMConfigurationPage } from '../../src/domain/llm/components';

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
