import axios from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  isTransientProviderError,
  withTransientRetry,
} from './withTransientRetry';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const axiosError = (status?: number) => ({
  isAxiosError: true,
  response: status === undefined ? undefined : { status },
});

describe('withTransientRetry', () => {
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    logger = stubLogger();
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockImplementation(
      (payload) =>
        typeof payload === 'object' &&
        payload !== null &&
        (payload as { isAxiosError?: boolean }).isAxiosError === true,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const run = <T>(operation: () => Promise<T>) =>
    withTransientRetry(operation, { logger, label: 'test', delayMs: 0 });

  describe('when the operation succeeds', () => {
    it('returns its result without retrying', async () => {
      const operation = jest.fn().mockResolvedValue('ok');

      await expect(run(operation)).resolves.toBe('ok');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the operation fails transiently', () => {
    it.each([undefined, 408, 429, 500, 502, 503, 504])(
      'retries once on status %s',
      async (status) => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(axiosError(status))
          .mockResolvedValue('recovered');

        await expect(run(operation)).resolves.toBe('recovered');
        expect(operation).toHaveBeenCalledTimes(2);
      },
    );

    it('rethrows when the retry fails too', async () => {
      const error = axiosError(503);
      const operation = jest.fn().mockRejectedValue(error);

      await expect(run(operation)).rejects.toBe(error);
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('when the operation fails permanently', () => {
    it.each([401, 403, 404, 422])(
      'does not retry on status %s',
      async (status) => {
        const error = axiosError(status);
        const operation = jest.fn().mockRejectedValue(error);

        await expect(run(operation)).rejects.toBe(error);
        expect(operation).toHaveBeenCalledTimes(1);
      },
    );

    it('does not retry non-axios errors', async () => {
      const error = new Error('boom');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(run(operation)).rejects.toBe(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('isTransientProviderError', () => {
    it('treats a response-less axios error as transient', () => {
      expect(isTransientProviderError(axiosError())).toBe(true);
    });

    it('treats a 403 as permanent', () => {
      expect(isTransientProviderError(axiosError(403))).toBe(false);
    });
  });
});
