import React from 'react';
import { PMBox } from '../PMBox/PMBox';
import { PMVStack } from '../PMVStack/PMVStack';
import { PMHeading } from '../../typography/PMHeading';
import { PMImage } from '../../content/PMImage/PMImage';
import { List } from '@chakra-ui/react';
import { logoPackmind } from '@packmind/assets';

export interface IPMVerticalNavProps {
  children: React.ReactNode;
  headerNav?: React.ReactNode;
  footerNav?: React.ReactNode;
  logo?: boolean;
  width?: string | number;
  showLogoContainer?: boolean;
}

export const PMVerticalNav: React.FC<IPMVerticalNavProps> = ({
  children,
  headerNav,
  footerNav,
  logo = true,
  width = '220px',
  showLogoContainer = true,
}) => {
  return (
    <PMVStack
      height="100%"
      width={width}
      bg="{colors.background.primary}"
      as="nav"
      borderRight={'1px solid'}
      borderColor={'{colors.border.tertiary}'}
      alignItems={'flex-start'}
      paddingBottom={4}
    >
      {showLogoContainer && (
        <PMBox
          height="44px"
          display="flex"
          justifyContent="left"
          alignItems="center"
          padding={4}
          mb={4}
          width="100%"
        >
          {logo && <PMImage src={logoPackmind} maxHeight={'20px'} />}
        </PMBox>
      )}
      {headerNav && (
        <PMBox w={'100%'} paddingX={2}>
          {headerNav}
        </PMBox>
      )}
      <PMVStack align="stretch" gap={6} height="100%" paddingY={4} width="100%">
        {children}
      </PMVStack>

      {footerNav && (
        <PMBox w={'full'} maxWidth={'full'} paddingX={2}>
          {footerNav}
        </PMBox>
      )}
    </PMVStack>
  );
};

export const PMVerticalNavSection: React.FC<{
  title?: string;
  navEntries: React.ReactNode[];
}> = ({ title, navEntries }) => {
  return (
    <PMBox>
      {title && (
        <PMHeading level="h6" color="faded" marginBottom={2} paddingX={4}>
          {title}
        </PMHeading>
      )}
      <List.Root listStyleType="none">
        {navEntries.map((entry, index) => (
          <List.Item key={index} paddingX={2}>
            {entry}
          </List.Item>
        ))}
      </List.Root>
    </PMBox>
  );
};
