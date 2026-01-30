import { logoPackmindText } from '@packmind/assets';
import { PMBox, PMImage, PMVStack } from '@packmind/ui';
import { Outlet } from 'react-router';

export default function PublicPageLayout() {
  return (
    <PMVStack
      flex="1"
      width="full"
      justify="center"
      align="center"
      gap={'6'}
      px={6}
      py={8}
    >
      <PMImage src={logoPackmindText} maxHeight={'32px'} />
      <PMBox
        bgColor={'background.primary'}
        borderRadius={'md'}
        width="full"
        maxWidth={{ base: '95%', md: '90%', lg: '80%' }}
        p={6}
      >
        <Outlet />
      </PMBox>
    </PMVStack>
  );
}
