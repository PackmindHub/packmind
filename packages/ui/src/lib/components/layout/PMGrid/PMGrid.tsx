import {
  Grid as ChakraGrid,
  GridProps as ChakraGridProps,
} from '@chakra-ui/react';

export type PMGridProps = ChakraGridProps;

export const PMGrid = (props: PMGridProps) => {
  return <ChakraGrid {...props} />;
};
