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

  const run = (edition: 'enterprise' | 'community'): void => {
    createEditionHeaderMiddleware(edition)(
      {} as Request,
      res as unknown as Response,
      next,
    );
  };

  describe('when the deployment runs the enterprise edition', () => {
    it('sets the edition header to enterprise', () => {
      run('enterprise');

      expect(res.setHeader).toHaveBeenCalledWith(
        PACKMIND_EDITION_HEADER,
        'enterprise',
      );
    });

    it('calls next', () => {
      run('enterprise');

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the deployment runs the community edition', () => {
    it('sets the edition header to community', () => {
      run('community');

      expect(res.setHeader).toHaveBeenCalledWith(
        PACKMIND_EDITION_HEADER,
        'community',
      );
    });

    it('calls next', () => {
      run('community');

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
