import { PMBox, PMButton, PMPopover, PMText, PMVStack } from '@packmind/ui';
import { CopiableTextField } from '../../../shared/components/inputs/CopiableTextField';

interface IGetDefaultSkillsPopoverProps {
  buttonVariant?: 'primary' | 'outline' | 'secondary' | 'tertiary';
  buttonSize?: 'xs' | 'sm' | 'md' | 'lg';
  buttonLabel?: string;
  placement?: 'bottom' | 'bottom-end' | 'bottom-start';
}

export const GetDefaultSkillsPopover = ({
  buttonVariant = 'outline',
  buttonSize = 'md',
  buttonLabel = 'Get default skills',
  placement = 'bottom-end',
}: IGetDefaultSkillsPopoverProps) => {
  return (
    <PMPopover.Root positioning={{ placement }}>
      <PMPopover.Trigger asChild>
        <PMButton
          variant={buttonVariant}
          size={buttonSize}
          title="Install Packmind's default skills to create standards and skills with your AI agent."
        >
          {buttonLabel}
        </PMButton>
      </PMPopover.Trigger>
      <PMPopover.Positioner>
        <PMPopover.Content width="380px">
          <PMPopover.Arrow>
            <PMPopover.ArrowTip />
          </PMPopover.Arrow>
          <PMPopover.Body>
            <PMPopover.Title>Get default skills</PMPopover.Title>
            <PMVStack gap={2} align="flex-start" mt={4}>
              <PMText color="secondary" as="p" variant="small">
                Use the Packmind CLI to install the default skills directly in
                your repository:
              </PMText>
              <PMBox w="full">
                <CopiableTextField
                  value="packmind-cli skills init"
                  readOnly
                  fontFamily="mono"
                  fontSize="sm"
                  placeholder=""
                  size="xs"
                />
              </PMBox>
            </PMVStack>
          </PMPopover.Body>
        </PMPopover.Content>
      </PMPopover.Positioner>
    </PMPopover.Root>
  );
};
