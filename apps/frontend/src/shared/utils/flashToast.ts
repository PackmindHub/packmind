import { pmToaster } from '@packmind/ui';

type FlashToast = {
  type: 'error' | 'success' | 'warning' | 'info';
  title: string;
  description: string;
};

let pendingToast: FlashToast | null = null;

export function setFlashToast(toast: FlashToast) {
  pendingToast = toast;
}

export function consumeFlashToast() {
  if (!pendingToast) return;
  const toast = pendingToast;
  pendingToast = null;
  pmToaster[toast.type]({
    title: toast.title,
    description: toast.description,
  });
}
