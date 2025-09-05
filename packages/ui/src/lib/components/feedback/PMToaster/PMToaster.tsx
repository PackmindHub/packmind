import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from '@chakra-ui/react';
import { ReactNode } from 'react';

export const pmToaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
});

type ToastItem = {
  id: string;
  type?: 'loading' | 'success' | 'error' | 'info';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  closable?: boolean;
};

type PMToasterProps = {
  toaster: typeof pmToaster;
  children: (toast: ToastItem) => ReactNode;
  insetInline?: Record<string, string>;
};

const ChakraToasterTyped = ChakraToaster as React.ComponentType<PMToasterProps>;

export const PMToaster = () => {
  return (
    <Portal>
      <ChakraToasterTyped toaster={pmToaster} insetInline={{ mdDown: '4' }}>
        {(toast) => (
          <Toast.Root width={{ md: 'sm' }}>
            {toast.type === 'loading' ? (
              <Spinner size="sm" color="blue.solid" />
            ) : (
              <Toast.Indicator />
            )}
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description>{toast.description}</Toast.Description>
              )}
            </Stack>
            {toast.action && (
              <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
            )}
            {toast.closable && <Toast.CloseTrigger />}
          </Toast.Root>
        )}
      </ChakraToasterTyped>
    </Portal>
  );
};
