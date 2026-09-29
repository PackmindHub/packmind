import { NextFunction, Request, Response } from 'express';
import { GitRemoteCredentialsMiddleware } from './GitRemoteCredentialsMiddleware';

const TOKEN_REMOTE = 'https://oauth2:glpat-secret@gitlab.acme.org/acme/app.git';
const CLEAN_REMOTE = 'https://gitlab.acme.org/acme/app.git';

describe('GitRemoteCredentialsMiddleware', () => {
  let middleware: GitRemoteCredentialsMiddleware;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    middleware = new GitRemoteCredentialsMiddleware();
    next = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  function run(url: string, body?: unknown): Request {
    const req = { url, originalUrl: `/api/v0${url}`, body } as Request;
    middleware.use(req, {} as Response, next);
    return req;
  }

  describe('when the query string carries a remote with a token', () => {
    const url = `/organizations/org-1/pull?packageSlug=a&gitRemoteUrl=${encodeURIComponent(TOKEN_REMOTE)}`;

    it('drops the token from the url', () => {
      expect(
        new URLSearchParams(run(url).url.split('?')[1]).get('gitRemoteUrl'),
      ).toBe(CLEAN_REMOTE);
    });

    it('drops the token from the original url', () => {
      expect(run(url).originalUrl).not.toContain('glpat-secret');
    });

    it('keeps the other parameters', () => {
      expect(
        new URLSearchParams(run(url).url.split('?')[1]).get('packageSlug'),
      ).toBe('a');
    });
  });

  describe('when the query string carries no credentials', () => {
    it('leaves the url untouched', () => {
      const url = '/organizations/org-1/pull?packageSlug=a%20b&gitBranch=main';

      expect(run(url).url).toBe(url);
    });
  });

  describe('when the body carries remotes with a token', () => {
    it('drops the token from each of them', () => {
      const req = run('/organizations/org-1/deployments', {
        gitRemoteUrl: TOKEN_REMOTE,
        repoRemoteUrl: TOKEN_REMOTE,
        gitBranch: 'main',
      });

      expect(req.body).toEqual({
        gitRemoteUrl: CLEAN_REMOTE,
        repoRemoteUrl: CLEAN_REMOTE,
        gitBranch: 'main',
      });
    });
  });

  describe('when the request has no body', () => {
    it('calls next', () => {
      run('/organizations/org-1/deployments');

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
