import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';
import {
  parsePackmindEdition,
  readPackmindEdition,
  throwIfFeatureAbsent,
} from './packmindEdition';

const buildResponse = (
  status: number,
  headers: Record<string, string> = {},
): Response => new Response(null, { status, headers });

describe('readPackmindEdition', () => {
  describe('when the server published the enterprise edition', () => {
    it('reads enterprise', () => {
      const response = buildResponse(404, { 'Packmind-Edition': 'enterprise' });

      expect(readPackmindEdition(response)).toBe('enterprise');
    });
  });

  describe('when the server published the community edition', () => {
    it('reads community', () => {
      const response = buildResponse(404, { 'Packmind-Edition': 'community' });

      expect(readPackmindEdition(response)).toBe('community');
    });
  });

  describe('when the header is absent', () => {
    it('reads nothing', () => {
      expect(readPackmindEdition(buildResponse(404))).toBeNull();
    });
  });

  describe('when the header carries an edition this CLI does not know', () => {
    it('reads nothing', () => {
      const response = buildResponse(404, { 'Packmind-Edition': 'starship' });

      expect(readPackmindEdition(response)).toBeNull();
    });
  });
});

describe('parsePackmindEdition', () => {
  // /auth/me on a server that predates this vocabulary still answers with the
  // old names, and reading those servers is why the fallback exists.
  describe('when the value uses the names that came before', () => {
    it('reads cloud as enterprise', () => {
      expect(parsePackmindEdition('cloud')).toBe('enterprise');
    });

    it('reads oss as community', () => {
      expect(parsePackmindEdition('oss')).toBe('community');
    });
  });

  describe('when the value is not a string', () => {
    it('reads nothing', () => {
      expect(parsePackmindEdition(undefined)).toBeNull();
    });
  });

  // A bare lookup on an object literal answers these, and a truthy answer
  // here would silence the 404 the header arrived with.
  describe.each(['constructor', 'toString', 'valueOf', '__proto__'])(
    'when the value is the inherited property %s',
    (value) => {
      it('reads nothing', () => {
        expect(parsePackmindEdition(value)).toBeNull();
      });
    },
  );
});

describe('throwIfFeatureAbsent', () => {
  describe('when a 404 comes from a Community Edition server', () => {
    it('reports the feature as absent', () => {
      expect(() =>
        throwIfFeatureAbsent(
          buildResponse(404),
          'community',
          'change proposals',
        ),
      ).toThrow(CommunityEditionError);
    });

    it('names the feature in the message', () => {
      expect(() =>
        throwIfFeatureAbsent(
          buildResponse(404),
          'community',
          'change proposals',
        ),
      ).toThrow(
        'The "change proposals" feature is not available in Packmind Community Edition.',
      );
    });
  });

  describe('when a 404 comes from an enterprise server', () => {
    it('lets the real error surface', () => {
      expect(() =>
        throwIfFeatureAbsent(
          buildResponse(404),
          'enterprise',
          'change proposals',
        ),
      ).not.toThrow();
    });
  });

  describe('when a Community Edition server fails on a route it does mount', () => {
    it('lets the real error surface', () => {
      expect(() =>
        throwIfFeatureAbsent(
          buildResponse(502),
          'community',
          'change proposals',
        ),
      ).not.toThrow();
    });
  });

  describe('when no edition could be established', () => {
    it('does not claim the Community Edition', () => {
      expect(() =>
        throwIfFeatureAbsent(buildResponse(404), null, 'change proposals'),
      ).not.toThrow(CommunityEditionError);
    });

    it('names both possible causes', () => {
      expect(() =>
        throwIfFeatureAbsent(buildResponse(404), null, 'change proposals'),
      ).toThrow(
        'The "change proposals" feature answered 404 and this Packmind server does not state which edition it runs. The feature is not part of Packmind Community Edition; on an Enterprise deployment, check that the space and organization still exist.',
      );
    });

    it('carries the status, so the transport surfaces it verbatim', () => {
      let thrown: (Error & { statusCode?: number }) | undefined;
      try {
        throwIfFeatureAbsent(buildResponse(404), null, 'change proposals');
      } catch (error) {
        thrown = error as Error & { statusCode?: number };
      }

      expect(thrown?.statusCode).toBe(404);
    });

    it('lets a non-404 through untouched', () => {
      expect(() =>
        throwIfFeatureAbsent(buildResponse(500), null, 'change proposals'),
      ).not.toThrow();
    });
  });
});
