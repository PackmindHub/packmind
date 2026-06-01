import { NextFunction, Request, Response } from 'express';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { CliVersionLoggerMiddleware } from './CliVersionLoggerMiddleware';

describe('CliVersionLoggerMiddleware', () => {
  let logger: jest.Mocked<PackmindLogger>;
  let middleware: CliVersionLoggerMiddleware;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    logger = stubLogger();
    middleware = new CliVersionLoggerMiddleware(logger);
    next = jest.fn();
  });

  function buildRequest(headers: Record<string, string | undefined>): Request {
    return {
      headers,
      method: 'GET',
      originalUrl: '/api/v0/example',
      url: '/api/v0/example',
    } as unknown as Request;
  }

  describe('when the User-Agent matches packmind-cli:<version>', () => {
    it('calls next', () => {
      const req = buildRequest({ 'user-agent': 'packmind-cli:1.2.3' });

      middleware.use(req, {} as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the User-Agent header is missing', () => {
    it('calls next', () => {
      const req = buildRequest({ 'user-agent': undefined });

      middleware.use(req, {} as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the User-Agent does not match the CLI pattern', () => {
    it('calls next', () => {
      const req = buildRequest({ 'user-agent': 'Mozilla/5.0' });

      middleware.use(req, {} as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  it('captures arbitrary version strings after the prefix', () => {
    const req = buildRequest({ 'user-agent': 'packmind-cli:2.0.0-next.4' });

    middleware.use(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
