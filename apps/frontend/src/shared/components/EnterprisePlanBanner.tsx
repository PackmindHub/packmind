import { PMBox } from '@packmind/ui';

export function EnterprisePlanBanner() {
  return (
    <PMBox
      bg="blue.500"
      py={2}
      textAlign="center"
      fontSize="sm"
      color="beige.1000"
    >
      Playbook update management will soon require an Enterprise plan.
    </PMBox>
  );
}
