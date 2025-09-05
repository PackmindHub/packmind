import {
  Spinner as ChakraSpinner,
  SpinnerProps as ChakraSpinnerProps,
} from '@chakra-ui/react';

export type PMSpinnerProps = ChakraSpinnerProps;

export const PMSpinner = (props: PMSpinnerProps) => {
  return <ChakraSpinner {...props} />;
};
