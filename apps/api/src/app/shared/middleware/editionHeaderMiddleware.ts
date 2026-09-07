import { NextFunction, Request, Response } from 'express';
import { PACKMIND_EDITION_HEADER, PackmindEdition } from '@packmind/types';

/**
 * Publishes the deployment's edition on every response.
 *
 * Registered with `app.use` in `main.ts` rather than through
 * `NestModule.configure`, because the middleware consumer there binds routes
 * and does not fire for an unmatched one — and the routing 404 an OSS stub
 * controller produces is exactly the response that has to carry the header.
 * `app.use` runs before route matching, so successes, errors and unmatched
 * paths all carry it.
 *
 * Takes the edition as a value rather than resolving it: the resolution reads
 * configuration asynchronously and the edition of a running deployment cannot
 * change, so `main.ts` resolves it once at bootstrap and closes over it.
 */
export function createEditionHeaderMiddleware(
  edition: PackmindEdition,
): (req: Request, res: Response, next: NextFunction) => void {
  return (_req, res, next) => {
    res.setHeader(PACKMIND_EDITION_HEADER, edition);
    next();
  };
}
