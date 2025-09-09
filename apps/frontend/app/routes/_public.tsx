import { logoPackmindText } from '@packmind/assets';
import { PMBox, PMImage, PMVStack } from '@packmind/ui';
import { Outlet } from 'react-router';

export default function PublicPageLayout() {
  return (
    <PMVStack margin={'auto 0'} gap={'6'}>
      <PMImage src={logoPackmindText} maxHeight={'32px'} />
      <PMBox
        bgColor={'background.primary'}
        borderRadius={'md'}
        minWidth="600px"
        maxWidth="600px"
        mx="auto"
        p={6}
      >
        <Outlet />
      </PMBox>
    </PMVStack>
  );
}
