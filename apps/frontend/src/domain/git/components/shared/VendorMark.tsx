import React from 'react';
import { PMBox, PMHStack, PMIcon, PMText } from '@packmind/ui';
import { LuGitBranch, LuGithub, LuGitlab } from 'react-icons/lu';
import { GitProviderVendor } from '@packmind/types';

const VENDOR_LABEL: Record<GitProviderVendor, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  unknown: 'Git',
};

export const vendorLabel = (vendor: GitProviderVendor): string =>
  VENDOR_LABEL[vendor];

const VENDOR_ICON: Record<GitProviderVendor, React.ReactNode> = {
  github: <LuGithub />,
  gitlab: <LuGitlab />,
  unknown: <LuGitBranch />,
};

export const vendorIcon = (vendor: GitProviderVendor): React.ReactNode =>
  VENDOR_ICON[vendor];

export const BRANDED_VENDORS: readonly GitProviderVendor[] = [
  'github',
  'gitlab',
];

interface VendorMarkProps {
  vendor: GitProviderVendor;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const VendorMark: React.FC<VendorMarkProps> = ({
  vendor,
  size = 'sm',
  showLabel = true,
}) => {
  const iconSize = size === 'md' ? '18px' : '14px';
  const label = VENDOR_LABEL[vendor];

  return (
    <PMHStack gap={2} align="center" minW={0}>
      <PMBox
        aria-hidden
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
        <PMIcon fontSize={iconSize}>{vendorIcon(vendor)}</PMIcon>
      </PMBox>
      {showLabel && (
        <PMText
          fontSize={size === 'md' ? 'sm' : 'xs'}
          color="secondary"
          fontWeight="medium"
        >
          {label}
        </PMText>
      )}
    </PMHStack>
  );
};
