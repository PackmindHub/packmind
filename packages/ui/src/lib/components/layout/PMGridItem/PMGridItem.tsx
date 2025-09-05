import {
  GridItem as ChakraGridItem,
  GridItemProps as ChakraGridItemProps,
} from '@chakra-ui/react';

export type PMGridItemProps = ChakraGridItemProps;

export const PMGridItem = (props: PMGridItemProps) => {
  return <ChakraGridItem {...props} />;
};
