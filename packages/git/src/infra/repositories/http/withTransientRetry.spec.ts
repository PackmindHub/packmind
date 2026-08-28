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
    let operation: jest.Mock;
    let result: unknown;

    beforeEach(async () => {
      operation = jest.fn().mockResolvedValue('ok');
      result = await run(operation);
    });

    it('returns its result', () => {
      expect(result).toBe('ok');
    });

    it('attempts once', () => {
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the operation fails transiently', () => {
    describe.each([undefined, 408, 429, 500, 502, 503, 504])(
      'on status %s',
      (status) => {
        let operation: jest.Mock;
        let result: unknown;

        beforeEach(async () => {
          operation = jest
            .fn()
            .mockRejectedValueOnce(axiosError(status))
            .mockResolvedValue('recovered');
          result = await run(operation);
        });

        it('returns what the second attempt produced', () => {
          expect(result).toBe('recovered');
        });

        it('attempts twice', () => {
          expect(operation).toHaveBeenCalledTimes(2);
        });
      },
    );

    describe('when the retry fails too', () => {
      const error = axiosError(503);
      let operation: jest.Mock;
      let rejection: unknown;

      beforeEach(async () => {
        operation = jest.fn().mockRejectedValue(error);
        rejection = await run(operation).catch((thrown) => thrown);
      });

      it('rethrows the error', () => {
        expect(rejection).toBe(error);
      });

      it('attempts twice', () => {
        expect(operation).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('when the operation fails permanently', () => {
    describe.each([401, 403, 404, 422])('on status %s', (status) => {
      const error = axiosError(status);
      let operation: jest.Mock;
      let rejection: unknown;

      beforeEach(async () => {
        operation = jest.fn().mockRejectedValue(error);
        rejection = await run(operation).catch((thrown) => thrown);
      });

      it('rethrows the error', () => {
        expect(rejection).toBe(error);
      });

      it('attempts once', () => {
        expect(operation).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the error did not come from axios', () => {
      const error = new Error('boom');
      let operation: jest.Mock;
      let rejection: unknown;

      beforeEach(async () => {
        operation = jest.fn().mockRejectedValue(error);
        rejection = await run(operation).catch((thrown) => thrown);
      });

      it('rethrows the error', () => {
        expect(rejection).toBe(error);
      });

      it('attempts once', () => {
        expect(operation).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('isTransientProviderError', () => {
    describe('when an axios error carries no response', () => {
      it('treats it as transient', () => {
        expect(isTransientProviderError(axiosError())).toBe(true);
      });
    });

    describe('when the provider answered with a 403', () => {
      it('treats it as permanent', () => {
        expect(isTransientProviderError(axiosError(403))).toBe(false);
      });
    });
  });
});
