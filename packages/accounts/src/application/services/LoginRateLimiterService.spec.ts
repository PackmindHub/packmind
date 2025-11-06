import {
  LoginRateLimiterService,
  LoginAttempt,
} from './LoginRateLimiterService';
import { TooManyLoginAttemptsError } from '../../domain/errors/TooManyLoginAttemptsError';
import { Cache, Configuration } from '@packmind/node-utils';

// Mock the dependencies
jest.mock('@packmind/node-utils', () => ({
  Cache: {
    getInstance: jest.fn(),
  },
  Configuration: {
    getConfig: jest.fn(),
  },
  PackmindLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  maskEmail: jest.fn((_email) => '***@***'),
}));

describe('LoginRateLimiterService', () => {
  let service: LoginRateLimiterService;
  let mockCache: {
    get: jest.Mock;
    set: jest.Mock;
    invalidate: jest.Mock;
    initialize: jest.Mock;
    disconnect: jest.Mock;
    getStats: jest.Mock;
  };

  beforeEach(() => {
    // Create mock cache instance
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
      initialize: jest.fn(),
      disconnect: jest.fn(),
      getStats: jest.fn(),
    };

    // Mock Cache.getInstance to return our mock
    (Cache.getInstance as jest.Mock).mockReturnValue(mockCache);

    // Mock Configuration.getConfig to return default values
    (Configuration.getConfig as jest.Mock).mockImplementation((key: string) => {
      if (key === 'LOGIN_BAN_TIME_SECONDS') return Promise.resolve(null);
      if (key === 'MAX_LOGIN_ATTEMPTS') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    service = new LoginRateLimiterService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkLoginAllowed', () => {
    const testEmail = 'test@example.com';

    it('allows login with no previous attempts', async () => {
      mockCache.get.mockResolvedValue(null);

      await expect(service.checkLoginAllowed(testEmail)).resolves.not.toThrow();

      expect(mockCache.get).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
      );
    });

    it('allows login with empty attempts array', async () => {
      mockCache.get.mockResolvedValue([]);

      await expect(service.checkLoginAllowed(testEmail)).resolves.not.toThrow();
    });

    it('allows login with less than max valid attempts', async () => {
      const now = new Date();
      const attempts: LoginAttempt[] = [
        { timestamp: new Date(now.getTime() - 10 * 60 * 1000) }, // 10 minutes ago
        { timestamp: new Date(now.getTime() - 5 * 60 * 1000) }, // 5 minutes ago
      ];

      mockCache.get.mockResolvedValue(attempts);

      await expect(service.checkLoginAllowed(testEmail)).resolves.not.toThrow();
    });

    it('throws TooManyLoginAttemptsError with max or more valid attempts', async () => {
      const now = new Date();
      const attempts: LoginAttempt[] = [
        { timestamp: new Date(now.getTime() - 25 * 60 * 1000) }, // 25 minutes ago
        { timestamp: new Date(now.getTime() - 15 * 60 * 1000) }, // 15 minutes ago
        { timestamp: new Date(now.getTime() - 5 * 60 * 1000) }, // 5 minutes ago
      ];

      mockCache.get.mockResolvedValue(attempts);
      // Ensure we have explicit mocks for both configuration values
      (Configuration.getConfig as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === 'LOGIN_BAN_TIME_SECONDS') return Promise.resolve(null); // Use default 30 min
          if (key === 'MAX_LOGIN_ATTEMPTS') return Promise.resolve(null); // Use default 3
          return Promise.resolve(null);
        },
      );

      await expect(service.checkLoginAllowed(testEmail)).rejects.toThrow(
        TooManyLoginAttemptsError,
      );
    });

    it('filters out expired attempts and allows login', async () => {
      const now = new Date();
      const attempts: LoginAttempt[] = [
        { timestamp: new Date(now.getTime() - 35 * 60 * 1000) }, // 35 minutes ago (expired)
        { timestamp: new Date(now.getTime() - 32 * 60 * 1000) }, // 32 minutes ago (expired)
        { timestamp: new Date(now.getTime() - 5 * 60 * 1000) }, // 5 minutes ago (valid)
      ];

      mockCache.get.mockResolvedValue(attempts);

      await expect(service.checkLoginAllowed(testEmail)).resolves.not.toThrow();

      // Should update cache with only valid attempts
      expect(mockCache.set).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
        [{ timestamp: attempts[2].timestamp }],
        30 * 60, // 30 minutes default
      );
    });

    it('uses custom ban time from configuration', async () => {
      const customBanTime = 60 * 60; // 1 hour
      (Configuration.getConfig as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === 'LOGIN_BAN_TIME_SECONDS')
            return Promise.resolve(customBanTime.toString());
          if (key === 'MAX_LOGIN_ATTEMPTS') return Promise.resolve(null); // Use default
          return Promise.resolve(null);
        },
      );

      const now = new Date();
      const attempts: LoginAttempt[] = [
        { timestamp: new Date(now.getTime() - 45 * 60 * 1000) }, // 45 minutes ago
        { timestamp: new Date(now.getTime() - 30 * 60 * 1000) }, // 30 minutes ago
        { timestamp: new Date(now.getTime() - 15 * 60 * 1000) }, // 15 minutes ago
      ];

      mockCache.get.mockResolvedValue(attempts);

      await expect(service.checkLoginAllowed(testEmail)).rejects.toThrow(
        TooManyLoginAttemptsError,
      );

      expect(Configuration.getConfig).toHaveBeenCalledWith(
        'LOGIN_BAN_TIME_SECONDS',
      );
      expect(Configuration.getConfig).toHaveBeenCalledWith(
        'MAX_LOGIN_ATTEMPTS',
      );
    });

    it('uses custom max attempts from configuration', async () => {
      const customMaxAttempts = 5;
      (Configuration.getConfig as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === 'MAX_LOGIN_ATTEMPTS')
            return Promise.resolve(customMaxAttempts.toString());
          if (key === 'LOGIN_BAN_TIME_SECONDS') return Promise.resolve(null); // Use default
          return Promise.resolve(null);
        },
      );

      const now = new Date();
      // Create 4 attempts - should not be banned yet with max of 5
      const attempts: LoginAttempt[] = [
        { timestamp: new Date(now.getTime() - 25 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 20 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 15 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 5 * 60 * 1000) },
      ];

      mockCache.get.mockResolvedValue(attempts);

      await expect(service.checkLoginAllowed(testEmail)).resolves.not.toThrow();

      expect(Configuration.getConfig).toHaveBeenCalledWith(
        'MAX_LOGIN_ATTEMPTS',
      );
    });

    it('bans user reaching custom max attempts', async () => {
      const customMaxAttempts = 2; // Lower threshold
      (Configuration.getConfig as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === 'MAX_LOGIN_ATTEMPTS')
            return Promise.resolve(customMaxAttempts.toString());
          if (key === 'LOGIN_BAN_TIME_SECONDS') return Promise.resolve(null); // Use default
          return Promise.resolve(null);
        },
      );

      const now = new Date();
      // Create 2 attempts - should be banned with max of 2
      const attempts: LoginAttempt[] = [
        { timestamp: new Date(now.getTime() - 15 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 5 * 60 * 1000) },
      ];

      mockCache.get.mockResolvedValue(attempts);

      await expect(service.checkLoginAllowed(testEmail)).rejects.toThrow(
        TooManyLoginAttemptsError,
      );

      expect(Configuration.getConfig).toHaveBeenCalledWith(
        'MAX_LOGIN_ATTEMPTS',
      );
    });

    it('handles invalid ban time configuration gracefully', async () => {
      (Configuration.getConfig as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === 'LOGIN_BAN_TIME_SECONDS')
            return Promise.resolve('invalid');
          if (key === 'MAX_LOGIN_ATTEMPTS') return Promise.resolve(null);
          return Promise.resolve(null);
        },
      );

      const now = new Date();
      const attempts: LoginAttempt[] = [
        { timestamp: new Date(now.getTime() - 25 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 15 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 5 * 60 * 1000) },
      ];

      mockCache.get.mockResolvedValue(attempts);

      await expect(service.checkLoginAllowed(testEmail)).rejects.toThrow(
        TooManyLoginAttemptsError,
      );
    });

    it('handles invalid max attempts configuration gracefully', async () => {
      (Configuration.getConfig as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === 'MAX_LOGIN_ATTEMPTS') return Promise.resolve('invalid');
          if (key === 'LOGIN_BAN_TIME_SECONDS') return Promise.resolve(null);
          return Promise.resolve(null);
        },
      );

      const now = new Date();
      const attempts: LoginAttempt[] = [
        { timestamp: new Date(now.getTime() - 25 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 15 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 5 * 60 * 1000) },
      ];

      mockCache.get.mockResolvedValue(attempts);

      // Should use default max attempts (3) and ban the user
      await expect(service.checkLoginAllowed(testEmail)).rejects.toThrow(
        TooManyLoginAttemptsError,
      );
    });

    it('handles cache errors gracefully', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache connection error'));

      await expect(service.checkLoginAllowed(testEmail)).resolves.not.toThrow();
    });

    it('converts email to lowercase for cache key', async () => {
      mockCache.get.mockResolvedValue(null);

      await service.checkLoginAllowed('TEST@EXAMPLE.COM');

      expect(mockCache.get).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
      );
    });
  });

  describe('recordFailedAttempt', () => {
    const testEmail = 'test@example.com';

    it('records a new failed attempt', async () => {
      mockCache.get.mockResolvedValue([]);

      await service.recordFailedAttempt(testEmail);

      expect(mockCache.set).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
        [{ timestamp: expect.any(Date) }],
        30 * 60, // default ban time
      );
    });

    it('appends to existing attempts', async () => {
      const existingAttempts: LoginAttempt[] = [
        { timestamp: new Date(Date.now() - 10 * 60 * 1000) },
      ];
      mockCache.get.mockResolvedValue(existingAttempts);

      await service.recordFailedAttempt(testEmail);

      expect(mockCache.set).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
        [...existingAttempts, { timestamp: expect.any(Date) }],
        30 * 60,
      );
    });

    it('uses custom ban time from configuration', async () => {
      const customBanTime = 3600; // 1 hour
      (Configuration.getConfig as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === 'LOGIN_BAN_TIME_SECONDS')
            return Promise.resolve(customBanTime.toString());
          return Promise.resolve(null);
        },
      );
      mockCache.get.mockResolvedValue([]);

      await service.recordFailedAttempt(testEmail);

      expect(mockCache.set).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
        [{ timestamp: expect.any(Date) }],
        customBanTime,
      );
    });

    it('handles cache errors gracefully', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));

      await expect(
        service.recordFailedAttempt(testEmail),
      ).resolves.not.toThrow();
    });

    it('handles cache set errors gracefully', async () => {
      mockCache.get.mockResolvedValue([]);
      mockCache.set.mockRejectedValue(new Error('Cache set error'));

      await expect(
        service.recordFailedAttempt(testEmail),
      ).resolves.not.toThrow();
    });

    it('converts email to lowercase for cache key', async () => {
      mockCache.get.mockResolvedValue([]);

      await service.recordFailedAttempt('TEST@EXAMPLE.COM');

      expect(mockCache.get).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
        expect.any(Array),
        expect.any(Number),
      );
    });
  });

  describe('clearAttempts', () => {
    const testEmail = 'test@example.com';

    it('clears login attempts for a user', async () => {
      await service.clearAttempts(testEmail);

      expect(mockCache.invalidate).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
      );
    });

    it('handles cache errors gracefully', async () => {
      mockCache.invalidate.mockRejectedValue(
        new Error('Cache invalidate error'),
      );

      await expect(service.clearAttempts(testEmail)).resolves.not.toThrow();
    });

    it('converts email to lowercase for cache key', async () => {
      await service.clearAttempts('TEST@EXAMPLE.COM');

      expect(mockCache.invalidate).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
      );
    });
  });

  describe('Configuration handling', () => {
    it('handles configuration fetch errors gracefully', async () => {
      (Configuration.getConfig as jest.Mock).mockRejectedValue(
        new Error('Config error'),
      );

      const now = new Date();
      const attempts: LoginAttempt[] = [
        { timestamp: new Date(now.getTime() - 25 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 15 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 5 * 60 * 1000) },
      ];

      mockCache.get.mockResolvedValue(attempts);

      await expect(
        service.checkLoginAllowed('test@example.com'),
      ).rejects.toThrow(TooManyLoginAttemptsError);
    });

    it('handles zero or negative ban time configuration', async () => {
      (Configuration.getConfig as jest.Mock).mockResolvedValue('0');

      const now = new Date();
      const attempts: LoginAttempt[] = [
        { timestamp: new Date(now.getTime() - 25 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 15 * 60 * 1000) },
        { timestamp: new Date(now.getTime() - 5 * 60 * 1000) },
      ];

      mockCache.get.mockResolvedValue(attempts);

      await expect(
        service.checkLoginAllowed('test@example.com'),
      ).rejects.toThrow(TooManyLoginAttemptsError);
    });
  });
});
