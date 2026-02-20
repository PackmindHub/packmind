import {
  modeToPermissionString,
  modeToPermissionStringOrDefault,
  parsePermissionString,
  supportsUnixPermissions,
} from './permissions';

describe('modeToPermissionString', () => {
  it('converts 0o644 to rw-r--r--', () => {
    expect(modeToPermissionString(0o100644)).toBe('rw-r--r--');
  });

  it('converts 0o755 to rwxr-xr-x', () => {
    expect(modeToPermissionString(0o100755)).toBe('rwxr-xr-x');
  });

  it('converts 0o777 to rwxrwxrwx', () => {
    expect(modeToPermissionString(0o100777)).toBe('rwxrwxrwx');
  });

  it('converts 0o000 to ---------', () => {
    expect(modeToPermissionString(0o100000)).toBe('---------');
  });

  it('converts 0o600 to rw-------', () => {
    expect(modeToPermissionString(0o100600)).toBe('rw-------');
  });
});

describe('modeToPermissionStringOrDefault', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('when on Unix', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
    });

    it('returns actual permissions from mode', () => {
      expect(modeToPermissionStringOrDefault(0o100755)).toBe('rwxr-xr-x');
    });
  });

  describe('when on Windows', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
    });

    it('returns default permissions regardless of mode', () => {
      expect(modeToPermissionStringOrDefault(0o100755)).toBe('rw-r--r--');
    });
  });
});

describe('supportsUnixPermissions', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns true on linux', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    expect(supportsUnixPermissions()).toBe(true);
  });

  it('returns true on darwin', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    expect(supportsUnixPermissions()).toBe(true);
  });

  it('returns false on win32', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    expect(supportsUnixPermissions()).toBe(false);
  });
});

describe('parsePermissionString', () => {
  it('converts rw-r--r-- to 0o644', () => {
    expect(parsePermissionString('rw-r--r--')).toBe(0o644);
  });

  it('converts rwxr-xr-x to 0o755', () => {
    expect(parsePermissionString('rwxr-xr-x')).toBe(0o755);
  });

  it('converts rwxrwxrwx to 0o777', () => {
    expect(parsePermissionString('rwxrwxrwx')).toBe(0o777);
  });

  it('converts --------- to 0o000', () => {
    expect(parsePermissionString('---------')).toBe(0o000);
  });

  it('converts rw------- to 0o600', () => {
    expect(parsePermissionString('rw-------')).toBe(0o600);
  });
});

describe('roundtrip', () => {
  it('converts mode to string and back for 0o644', () => {
    const mode = 0o644;
    const str = modeToPermissionString(mode);
    expect(parsePermissionString(str)).toBe(mode);
  });

  it('converts mode to string and back for 0o755', () => {
    const mode = 0o755;
    const str = modeToPermissionString(mode);
    expect(parsePermissionString(str)).toBe(mode);
  });
});
