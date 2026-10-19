import { isPackmindCloud } from './isPackmindCloud';

describe('isPackmindCloud', () => {
  const originalLocation = window.location;

  const setHostname = (hostname: string) => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname },
      configurable: true,
    });
  };

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
    });
  });

  it('returns true on app.packmind.ai', () => {
    setHostname('app.packmind.ai');

    expect(isPackmindCloud()).toBe(true);
  });

  it('returns false on a self-hosted instance', () => {
    setHostname('packmind.acme.internal');

    expect(isPackmindCloud()).toBe(false);
  });

  it('returns false on a host that merely contains the cloud hostname', () => {
    setHostname('app.packmind.ai.evil.com');

    expect(isPackmindCloud()).toBe(false);
  });

  it('returns false on localhost', () => {
    setHostname('localhost');

    expect(isPackmindCloud()).toBe(false);
  });
});
