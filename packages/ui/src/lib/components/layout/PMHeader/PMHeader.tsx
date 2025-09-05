import React from 'react';
import { PMBox } from '../PMBox/PMBox';
import { PMFlex } from '../PMFlex/PMFlex';

export interface IPMHeaderProps {
  children?: React.ReactNode;
  color: 'primary' | 'secondary' | 'tertiary';
}

export const PMHeader: React.FC<IPMHeaderProps> = ({ children, color }) => {
  return (
    <PMBox
      as="nav"
      height={'full'}
      width="100%"
      position="sticky"
      top="0"
      zIndex="sticky"
      borderBottom={'1px solid'}
      borderColor={'{colors.border.tertiary}'}
      backgroundColor={`{colors.background.${color}}`}
    >
      <PMFlex align="center" justify="space-between" height="100%" px={4}>
        {children}
      </PMFlex>
    </PMBox>
  );
};
