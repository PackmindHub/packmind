import * as Sentry from '@sentry/react';
import { getEnvVar } from '../../shared/utils/getEnvVar';
import { isPackmindCloud } from '../../shared/utils/isPackmindCloud';
import { initSentry } from './SentryService';

vi.mock('@sentry/react', () => ({ init: vi.fn() }));
vi.mock('../../shared/utils/getEnvVar', () => ({
  getEnvVar: vi.fn(),
}));
vi.mock('../../shared/utils/isPackmindCloud', () => ({
  isPackmindCloud: vi.fn(),
}));

describe('initSentry', () => {
  beforeEach(() => {
    vi.mocked(getEnvVar).mockImplementation((name, defaultValue = '') =>
      name === 'VITE_SENTRY_FRONTEND_DSN' ? 'https://dsn' : defaultValue,
    );
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(Sentry.init).mockReset();
    vi.mocked(getEnvVar).mockReset();
    vi.mocked(isPackmindCloud).mockReset();
  });

  it('initializes Sentry on Packmind Cloud', () => {
    vi.mocked(isPackmindCloud).mockReturnValue(true);

    initSentry();

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://dsn' }),
    );
  });

  it('does not initialize Sentry outside Packmind Cloud, even with a DSN', () => {
    vi.mocked(isPackmindCloud).mockReturnValue(false);

    initSentry();

    expect(Sentry.init).not.toHaveBeenCalled();
  });
});
