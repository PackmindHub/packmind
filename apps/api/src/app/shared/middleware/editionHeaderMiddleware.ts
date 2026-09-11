import { NextFunction, Request, Response } from 'express';
import { PACKMIND_EDITION_HEADER, PackmindEdition } from '@packmind/types';

/**
 * Publishes the deployment's edition on every response. Registered with
 * `app.use` in `main.ts`, not through `NestModule.configure`: the consumer
 * there binds routes and skips unmatched ones, which is the routing 404 that
 * has to carry the header. Takes the edition as a value because `main.ts`
 * resolves it once at bootstrap.
 */
export function createEditionHeaderMiddleware(
  edition: PackmindEdition,
): (req: Request, res: Response, next: NextFunction) => void {
  return (_req, res, next) => {
    res.setHeader(PACKMIND_EDITION_HEADER, edition);
    next();
  };
}
