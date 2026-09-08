import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';
import { readPackmindEdition, throwIfFeatureAbsent } from './packmindEdition';

const buildResponse = (
  status: number,
  headers: Record<string, string> = {},
): Response => new Response(null, { status, headers });

describe('readPackmindEdition', () => {
  describe('when the server published the cloud edition', () => {
    it('reads cloud', () => {
      const response = buildResponse(404, { 'Packmind-Edition': 'cloud' });

      expect(readPackmindEdition(response)).toBe('cloud');
    });
  });

  describe('when the server published the oss edition', () => {
    it('reads oss', () => {
      const response = buildResponse(404, { 'Packmind-Edition': 'oss' });

      expect(readPackmindEdition(response)).toBe('oss');
    });
  });

  describe('when the header is absent', () => {
    it('reads nothing', () => {
      expect(readPackmindEdition(buildResponse(404))).toBeNull();
    });
  });

  describe('when the header carries an edition this CLI does not know', () => {
    it('reads nothing', () => {
      const response = buildResponse(404, { 'Packmind-Edition': 'enterprise' });

      expect(readPackmindEdition(response)).toBeNull();
    });
  });
});

describe('throwIfFeatureAbsent', () => {
  describe('when a 404 comes from a Community Edition server', () => {
    it('reports the feature as absent', () => {
      expect(() =>
        throwIfFeatureAbsent(buildResponse(404), 'oss', 'change proposals'),
      ).toThrow(CommunityEditionError);
    });

    it('names the feature in the message', () => {
      expect(() =>
        throwIfFeatureAbsent(buildResponse(404), 'oss', 'change proposals'),
      ).toThrow(
        'The "change proposals" feature is not available in Packmind Community Edition.',
      );
    });
  });

  describe('when a 404 comes from a cloud server', () => {
    it('lets the real error surface', () => {
      expect(() =>
        throwIfFeatureAbsent(buildResponse(404), 'cloud', 'change proposals'),
      ).not.toThrow();
    });
  });

  describe('when a Community Edition server fails on a route it does mount', () => {
    it('lets the real error surface', () => {
      expect(() =>
        throwIfFeatureAbsent(buildResponse(502), 'oss', 'change proposals'),
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
        'The "change proposals" feature answered 404 and this Packmind server does not state which edition it runs. The feature is not part of Packmind Community Edition; on a cloud deployment, check that the space and organization still exist.',
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
