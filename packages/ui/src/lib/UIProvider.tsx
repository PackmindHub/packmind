import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { packmindDesignSystemFactory } from './theme/theme';

interface UIProviderProps {
  preflight?: boolean;
  children: React.ReactNode;
}

export const UIProvider = ({ preflight, children }: UIProviderProps) => {
  return (
    <ChakraProvider
      value={packmindDesignSystemFactory(
        preflight === undefined ? true : preflight,
      )}
    >
      {children}
    </ChakraProvider>
  );
};
