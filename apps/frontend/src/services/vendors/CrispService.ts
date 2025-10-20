import { getEnvVar } from '../../shared/utils/getEnvVar';

const CRISP_WEBSITE_ID = getEnvVar('VITE_CRISP_WEBSITE_ID');

export function initCrisp() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const w = window as unknown as {
    $crisp?: Array<unknown> & { push?: (args: unknown[]) => void };
    CRISP_WEBSITE_ID?: string;
  };

  w.$crisp ??= [] as unknown as Array<unknown> & {
    push?: (args: unknown[]) => void;
  };
  if (!w.CRISP_WEBSITE_ID) {
    w.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
    const s = document.createElement('script');
    s.src = 'https://client.crisp.chat/l.js';
    s.async = true;
    s.defer = true;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }

  w.$crisp?.push?.(['do', 'chat:hide']);
}

export function setCrispUserInfo(userEmail?: string, userNickname?: string) {
  if (typeof window === 'undefined') return;

  const w = window as unknown as {
    $crisp?: Array<unknown> & { push?: (args: unknown[]) => void };
  };

  w.$crisp ??= [] as unknown as Array<unknown> & {
    push?: (args: unknown[]) => void;
  };

  if (userEmail) {
    w.$crisp?.push?.(['set', 'user:email', userEmail]);
  }
  if (userNickname) {
    w.$crisp?.push?.(['set', 'user:nickname', userNickname]);
  }
}

export function showCrispWidget() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as {
    $crisp?: Array<unknown> & { push?: (args: unknown[]) => void };
  };
  w.$crisp ??= [] as unknown as Array<unknown> & {
    push?: (args: unknown[]) => void;
  };
  w.$crisp.push?.(['do', 'chat:show']);
}

export function hideCrispWidget() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as {
    $crisp?: Array<unknown> & { push?: (args: unknown[]) => void };
  };
  w.$crisp ??= [] as unknown as Array<unknown> & {
    push?: (args: unknown[]) => void;
  };
  w.$crisp.push?.(['do', 'chat:hide']);
}

export function openCrisp() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as {
    $crisp?: Array<unknown> & { push?: (args: unknown[]) => void };
  };
  w.$crisp ??= [] as unknown as Array<unknown> & {
    push?: (args: unknown[]) => void;
  };
  w.$crisp.push?.(['do', 'chat:show']);
  w.$crisp.push?.(['do', 'chat:open']);
}
