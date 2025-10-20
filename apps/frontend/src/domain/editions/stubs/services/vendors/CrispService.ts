import { pmToaster } from '@packmind/ui';

export function initCrisp() {
  // no-op
}

export function setCrispUserInfo(_userEmail?: string, _userNickname?: string) {
  // no-op
}

export function showCrispWidget() {
  // no-op
}

export function hideCrispWidget() {
  // no-op
}

export function openCrisp() {
  pmToaster.info({
    title: 'Chat unavailable',
    description:
      'Chat support is not available in the Community Edition of Packmind.',
  });
}
