import {
  PMBox,
  PMButton,
  PMField,
  PMHStack,
  PMInput,
  PMPopover,
  PMText,
  PMVStack,
} from '@packmind/ui';
export type SupportedVendor = 'github' | 'gitlab';

type PatAuthBlockProps = {
  vendor: SupportedVendor;
  value: string;
  error: string | null;
  disabled: boolean;
  onChange: (next: string) => void;
};

const TOKEN_PLACEHOLDER: Record<SupportedVendor, string> = {
  github: 'ghp_xxxxxxxxxxxxxxxxxxxx',
  gitlab: 'glpat-xxxxxxxxxxxxxxxxxxxx',
};

const PERMISSIONS_COPY: Record<SupportedVendor, string> = {
  github:
    "Generate a personal access token with repository access and read/write on 'Contents'. For classic tokens, use the 'repo' scope.",
  gitlab:
    'Generate a personal access token with api, read_repository, and write_repository scopes from your GitLab account settings.',
};

const VENDOR_LABEL: Record<SupportedVendor, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
};

export const PatAuthBlock: React.FC<PatAuthBlockProps> = ({
  vendor,
  value,
  error,
  disabled,
  onChange,
}) => {
  return (
    <PMVStack gap={3} align="stretch">
      <PMField.Root required invalid={!!error} disabled={disabled}>
        <PMHStack
          justify="space-between"
          align="center"
          width="full"
          marginBottom={1}
        >
          <PMField.Label fontSize="xs">
            Personal access token
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PermissionsPopover vendor={vendor} />
        </PMHStack>
        <PMInput
          size="sm"
          type="password"
          value={value}
          placeholder={TOKEN_PLACEHOLDER[vendor]}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
        />
        <PMField.HelperText>
          Stored encrypted. Rotate or revoke any time from your{' '}
          {VENDOR_LABEL[vendor]} account settings.
        </PMField.HelperText>
        <PMField.ErrorText>{error ?? ''}</PMField.ErrorText>
      </PMField.Root>
    </PMVStack>
  );
};

const PermissionsPopover: React.FC<{ vendor: SupportedVendor }> = ({
  vendor,
}) => {
  return (
    <PMPopover.Root positioning={{ placement: 'top-end' }}>
      <PMPopover.Trigger asChild>
        <PMButton variant="tertiary" size="xs">
          Needed permissions
        </PMButton>
      </PMPopover.Trigger>
      <PMPopover.Positioner>
        <PMPopover.Content>
          <PMPopover.CloseTrigger />
          <PMPopover.Arrow>
            <PMPopover.ArrowTip />
          </PMPopover.Arrow>
          <PMPopover.Body>
            <PMVStack gap={2} align="stretch">
              <PMText variant="body-important" as="p">
                Token scopes for {VENDOR_LABEL[vendor]}
              </PMText>
              <PMText fontSize="xs" color="secondary" as="p">
                {PERMISSIONS_COPY[vendor]}
              </PMText>
              <PMBox
                borderTop="1px solid"
                borderColor="border.tertiary"
                paddingTop={2}
              >
                <PMText fontSize="xs" color="faded" as="p">
                  Never share this token publicly. Packmind uses it only to
                  publish standards, recipes, and marketplace packages on your
                  behalf.
                </PMText>
              </PMBox>
            </PMVStack>
          </PMPopover.Body>
        </PMPopover.Content>
      </PMPopover.Positioner>
    </PMPopover.Root>
  );
};
