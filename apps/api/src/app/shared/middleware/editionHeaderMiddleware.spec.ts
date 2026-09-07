import { NextFunction, Request, Response } from 'express';
import { PACKMIND_EDITION_HEADER } from '@packmind/types';
import { createEditionHeaderMiddleware } from './editionHeaderMiddleware';

describe('createEditionHeaderMiddleware', () => {
  let res: jest.Mocked<Pick<Response, 'setHeader'>>;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  const run = (edition: 'cloud' | 'oss'): void => {
    createEditionHeaderMiddleware(edition)(
      {} as Request,
      res as unknown as Response,
      next,
    );
  };

  describe('when the deployment runs the cloud edition', () => {
    it('sets the edition header to cloud', () => {
      run('cloud');

      expect(res.setHeader).toHaveBeenCalledWith(
        PACKMIND_EDITION_HEADER,
        'cloud',
      );
    });

    it('calls next', () => {
      run('cloud');

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the deployment runs the OSS edition', () => {
    it('sets the edition header to oss', () => {
      run('oss');

      expect(res.setHeader).toHaveBeenCalledWith(
        PACKMIND_EDITION_HEADER,
        'oss',
      );
    });

    it('calls next', () => {
      run('oss');

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
