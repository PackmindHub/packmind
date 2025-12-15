import React, { useEffect } from 'react';
import { PMButton, PMText, PMVStack, PMAlert, PMField } from '@packmind/ui';
import { useCreateCliLoginCodeMutation } from '../api/queries/AuthQueries';
import { CopiableTextarea } from '../../../shared/components/inputs';

const DEFAULT_HOST = 'https://app.packmind.ai';

const buildInstallCommand = (loginCode: string) => {
  const currentHost = window.location.origin;
  const isDefaultHost = currentHost === DEFAULT_HOST;
  const hostExport = isDefaultHost
    ? ''
    : `export PACKMIND_HOST=${currentHost} && \\\n`;
  return `${hostExport}export PACKMIND_LOGIN_CODE=${loginCode} && \\\ncurl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/PackmindHub/packmind/main/apps/cli/scripts/install.sh | sh`;
};

const formatCodeExpiresAt = (expiresAt?: string | Date) => {
  if (!expiresAt) return '';
  try {
    const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    const minutes = Math.ceil((date.getTime() - Date.now()) / 60000);
    if (minutes <= 0) return 'Code expired';
    if (minutes === 1) return 'Code expires in 1 minute';
    return `Code expires in ${minutes} minutes`;
  } catch {
    return '';
  }
};

export const SetupLocalEnvironment: React.FunctionComponent = () => {
  const createCliLoginCodeMutation = useCreateCliLoginCodeMutation();

  // Automatically generate install command on mount
  useEffect(() => {
    if (
      !createCliLoginCodeMutation.data &&
      !createCliLoginCodeMutation.isPending
    ) {
      createCliLoginCodeMutation.mutate();
    }
    // Disable exhaustive-deps as we only want this to run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateInstallCommand = () => {
    createCliLoginCodeMutation.mutate();
  };

  return (
    <PMVStack width="full" alignItems="stretch" gap={4}>
      <PMText as="p">
        Copy and run this command in your terminal to install the CLI and MCP
        server automatically:
      </PMText>

      {createCliLoginCodeMutation.isPending && (
        <PMText as="p" color="tertiary">
          Generating install command...
        </PMText>
      )}

      {createCliLoginCodeMutation.isError && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>Error</PMAlert.Title>
          <PMAlert.Description>
            {createCliLoginCodeMutation.error instanceof Error
              ? createCliLoginCodeMutation.error.message
              : 'Failed to generate install command. Please try again.'}
          </PMAlert.Description>
        </PMAlert.Root>
      )}

      {createCliLoginCodeMutation.isSuccess &&
        createCliLoginCodeMutation.data && (
          <PMVStack width="full" gap={3} alignItems={'stretch'}>
            <PMField.Root>
              <PMField.Label>Install Command</PMField.Label>
              <CopiableTextarea
                value={buildInstallCommand(
                  createCliLoginCodeMutation.data.code,
                )}
                readOnly
                rows={3}
                data-testid="install-command"
                width={'full'}
              />
            </PMField.Root>

            <PMVStack width="full" gap={2} alignItems={'flex-start'}>
              <PMText variant="small" color="tertiary">
                {formatCodeExpiresAt(createCliLoginCodeMutation.data.expiresAt)}
              </PMText>

              <PMButton
                variant="tertiary"
                onClick={handleGenerateInstallCommand}
                disabled={createCliLoginCodeMutation.isPending}
                size="xs"
              >
                Generate New Command
              </PMButton>
            </PMVStack>
          </PMVStack>
        )}
    </PMVStack>
  );
};
