import { PMBox, PMText, PMHeading, PMIcon } from '@packmind/ui';
import { LuCircleCheckBig } from 'react-icons/lu';

export function AllCaughtUpState() {
  return (
    <PMBox
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={4}
      paddingY={16}
    >
      <PMIcon fontSize="4xl" color="green.400">
        <LuCircleCheckBig />
      </PMIcon>
      <PMBox textAlign="center">
        <PMHeading size="lg" marginBottom={2}>
          You're all caught up
        </PMHeading>
        <PMText fontSize="md" color="text.secondary" maxW="360px">
          Nothing needs your attention right now. Your spaces are in good shape.
        </PMText>
      </PMBox>
    </PMBox>
  );
}
