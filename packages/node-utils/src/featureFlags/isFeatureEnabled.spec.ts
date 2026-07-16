import { Configuration } from '../config/config/Configuration';
import { isFeatureEnabled } from './isFeatureEnabled';

describe('isFeatureEnabled', () => {
  let getConfigSpy: jest.SpyInstance;

  beforeEach(() => {
    getConfigSpy = jest.spyOn(Configuration, 'getConfig');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('when the env kill-switch is set', () => {
    it('reads the SCREAMING_SNAKE env key for the flag', async () => {
      getConfigSpy.mockResolvedValue('on');

      await isFeatureEnabled('change-proposals-in-webapp', {});

      expect(getConfigSpy).toHaveBeenCalledWith(
        'FF_CHANGE_PROPOSALS_IN_WEBAPP',
      );
    });

    it('reads the SCREAMING_SNAKE env key for the orga-space-management flag', async () => {
      getConfigSpy.mockResolvedValue('on');

      await isFeatureEnabled('orga-space-management', {});

      expect(getConfigSpy).toHaveBeenCalledWith('FF_ORGA_SPACE_MANAGEMENT');
    });

    describe('when set to "on"', () => {
      it('returns true', async () => {
        getConfigSpy.mockResolvedValue('on');

        const result = await isFeatureEnabled('change-proposals-in-webapp', {});

        expect(result).toBe(true);
      });
    });

    describe('when set to "all"', () => {
      it('returns true', async () => {
        getConfigSpy.mockResolvedValue('ALL');

        const result = await isFeatureEnabled('change-proposals-in-webapp', {});

        expect(result).toBe(true);
      });
    });

    describe('when set to "true"', () => {
      it('returns true', async () => {
        getConfigSpy.mockResolvedValue('True');

        const result = await isFeatureEnabled('change-proposals-in-webapp', {});

        expect(result).toBe(true);
      });
    });

    describe('when set to "off"', () => {
      it('returns false even for an allowed email', async () => {
        getConfigSpy.mockResolvedValue('off');

        const result = await isFeatureEnabled('change-proposals-in-webapp', {
          userEmail: 'user@packmind.com',
        });

        expect(result).toBe(false);
      });
    });

    describe('when set to "none"', () => {
      it('returns false', async () => {
        getConfigSpy.mockResolvedValue('NONE');

        const result = await isFeatureEnabled('change-proposals-in-webapp', {
          userEmail: 'user@packmind.com',
        });

        expect(result).toBe(false);
      });
    });

    describe('when set to "false"', () => {
      it('returns false', async () => {
        getConfigSpy.mockResolvedValue('false');

        const result = await isFeatureEnabled('change-proposals-in-webapp', {
          userEmail: 'user@packmind.com',
        });

        expect(result).toBe(false);
      });
    });
  });

  describe('when the env kill-switch is unset', () => {
    it('falls through to the email path and allows an allowed domain', async () => {
      getConfigSpy.mockResolvedValue(null);

      const result = await isFeatureEnabled('change-proposals-in-webapp', {
        userEmail: 'user@packmind.com',
      });

      expect(result).toBe(true);
    });

    it('falls through to the email path and denies a non-allowed domain', async () => {
      getConfigSpy.mockResolvedValue(null);

      const result = await isFeatureEnabled('change-proposals-in-webapp', {
        userEmail: 'user@example.com',
      });

      expect(result).toBe(false);
    });

    it('gates the orga-space-management flag by its allowed domain', async () => {
      getConfigSpy.mockResolvedValue(null);

      const result = await isFeatureEnabled('orga-space-management', {
        userEmail: 'user@packmind.com',
      });

      expect(result).toBe(true);
    });
  });

  describe('when the env kill-switch is an unrecognized value', () => {
    it('falls through to the email path', async () => {
      getConfigSpy.mockResolvedValue('maybe');

      const result = await isFeatureEnabled('change-proposals-in-webapp', {
        userEmail: 'user@packmind.com',
      });

      expect(result).toBe(true);
    });
  });

  describe('when the env kill-switch is an empty or whitespace string', () => {
    it('falls through to the email path for an empty string', async () => {
      getConfigSpy.mockResolvedValue('');

      const result = await isFeatureEnabled('change-proposals-in-webapp', {
        userEmail: 'user@promyze.com',
      });

      expect(result).toBe(true);
    });

    it('falls through to the email path for a whitespace-only string', async () => {
      getConfigSpy.mockResolvedValue('   ');

      const result = await isFeatureEnabled('change-proposals-in-webapp', {
        userEmail: 'user@example.com',
      });

      expect(result).toBe(false);
    });
  });

  describe('when no env kill-switch and email is missing', () => {
    it('returns false for an undefined email', async () => {
      getConfigSpy.mockResolvedValue(null);

      const result = await isFeatureEnabled('change-proposals-in-webapp', {});

      expect(result).toBe(false);
    });

    it('returns false for an empty email', async () => {
      getConfigSpy.mockResolvedValue(null);

      const result = await isFeatureEnabled('change-proposals-in-webapp', {
        userEmail: '',
      });

      expect(result).toBe(false);
    });
  });
});
