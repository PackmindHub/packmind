import { useState } from 'react';
import { PMPage, PMVStack } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../src/domain/spaces/hooks/useCurrentSpace';
import { CommandsList } from '../../src/domain/commands/components/CommandsList';
import { CommandsCreateButton } from '../../src/domain/commands/components/CommandsCreateButton';

export default function OrgCommandsIndex() {
  const { organization } = useAuthContext();
  const { spaceSlug } = useCurrentSpace();
  const [isEmpty, setIsEmpty] = useState(false);

  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Commands"
      subtitle="Commands are shortcuts you can run to trigger a specific action — use them to quickly repeat common tasks."
      actions={
        !isEmpty &&
        spaceSlug && (
          <CommandsCreateButton
            orgSlug={organization.slug}
            spaceSlug={spaceSlug}
          />
        )
      }
    >
      <PMVStack align="stretch" gap={6}>
        <CommandsList
          key={spaceSlug}
          orgSlug={organization.slug}
          onEmptyStateChange={setIsEmpty}
        />
      </PMVStack>
    </PMPage>
  );
}
