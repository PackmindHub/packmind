import React from 'react';
import { PMBox } from '../PMBox/PMBox';
import { PMVStack } from '../PMVStack/PMVStack';
import { PMHeading } from '../../typography/PMHeading';
import { PMImage } from '../../content/PMImage/PMImage';
import { List } from '@chakra-ui/react';
import { logoPackmind } from '@packmind/assets';

export interface IPMVerticalNavProps {
  children: React.ReactNode;
  footerNav?: React.ReactNode;
}

export const PMVerticalNav: React.FC<IPMVerticalNavProps> = ({
  children,
  footerNav,
}) => {
  return (
    <PMVStack
      height="100%"
      width="220px"
      bg="{colors.background.primary}"
      as="nav"
      borderRight={'1px solid'}
      borderColor={'{colors.border.tertiary}'}
      alignItems={'flex-start'}
      paddingBottom={4}
    >
      <PMBox
        height="44px"
        display="flex"
        justifyContent="left"
        alignItems="center"
        padding={4}
        mb={4}
        width="100%"
      >
        <PMImage src={logoPackmind} maxHeight={'20px'} />
      </PMBox>
      <PMVStack align="stretch" gap={6} height="100%" paddingY={4} width="100%">
        {children}
      </PMVStack>

      {footerNav && (
        <PMBox w={'100%'} display={'flex'} justifyContent={'center'}>
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
