import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { stripGitRemoteCredentials } from '@packmind/node-utils';

// The fields through which the CLI sends the remote of the repository it runs
// in, in a query string or a JSON body.
const REMOTE_FIELDS = ['gitRemoteUrl', 'repoRemoteUrl'];

function stripFromUrl(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return url;
  }
  const params = new URLSearchParams(url.slice(queryStart + 1));
  let changed = false;
  for (const field of REMOTE_FIELDS) {
    const value = params.get(field);
    if (value === null) {
      continue;
    }
    const stripped = stripGitRemoteCredentials(value);
    if (stripped !== value) {
      params.set(field, stripped);
      changed = true;
    }
  }
  return changed ? `${url.slice(0, queryStart)}?${params.toString()}` : url;
}

/**
 * Drops the credentials a clone URL may embed (`https://oauth2:<token>@host`)
 * from every remote a request carries, before anything logs or stores it.
 * Older CLIs send the remote as git reports it. Registered ahead of every
 * middleware that logs the request URL.
 */
@Injectable()
export class GitRemoteCredentialsMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    req.url = stripFromUrl(req.url);
    req.originalUrl = stripFromUrl(req.originalUrl);

    const body: unknown = req.body;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const fields = body as Record<string, unknown>;
      for (const field of REMOTE_FIELDS) {
        const value = fields[field];
        if (typeof value === 'string') {
          fields[field] = stripGitRemoteCredentials(value);
        }
      }
    }

    next();
  }
}
