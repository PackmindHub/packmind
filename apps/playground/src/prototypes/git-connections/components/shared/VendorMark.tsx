import { PMBox, PMHStack, PMIcon, PMText } from '@packmind/ui';
import { LuGithub, LuGitlab } from 'react-icons/lu';
import type { Vendor } from '../../types';

const VENDOR_LABEL: Record<Vendor, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
};

type VendorMarkProps = {
  vendor: Vendor;
  size?: 'sm' | 'md';
  showLabel?: boolean;
};

export function VendorMark({
  vendor,
  size = 'sm',
  showLabel = true,
}: Readonly<VendorMarkProps>) {
  const iconSize = size === 'md' ? '18px' : '14px';
  return (
    <PMHStack gap={2} align="center" minW={0}>
      <PMBox
        width={size === 'md' ? '28px' : '22px'}
        height={size === 'md' ? '28px' : '22px'}
        borderRadius="sm"
        bg="background.tertiary"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="text.primary"
        flexShrink={0}
      >
        <PMIcon fontSize={iconSize}>
          {vendor === 'github' ? <LuGithub /> : <LuGitlab />}
        </PMIcon>
      </PMBox>
      {showLabel && (
        <PMText
          fontSize={size === 'md' ? 'sm' : 'xs'}
          color="secondary"
          fontWeight="medium"
        >
          {VENDOR_LABEL[vendor]}
        </PMText>
      )}
    </PMHStack>
  );
}
