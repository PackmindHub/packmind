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
      const response = buildResponse(404, { 'Packmind-Edition': 'oss' });

      expect(() => throwIfFeatureAbsent(response, 'change proposals')).toThrow(
        CommunityEditionError,
      );
    });

    it('names the feature in the message', () => {
      const response = buildResponse(404, { 'Packmind-Edition': 'oss' });

      expect(() => throwIfFeatureAbsent(response, 'change proposals')).toThrow(
        'The "change proposals" feature is not available in Packmind Community Edition.',
      );
    });
  });

  describe('when a 404 comes from a cloud server', () => {
    it('lets the real error surface', () => {
      const response = buildResponse(404, { 'Packmind-Edition': 'cloud' });

      expect(() =>
        throwIfFeatureAbsent(response, 'change proposals'),
      ).not.toThrow();
    });
  });

  describe('when a 404 carries no edition header', () => {
    it('lets the real error surface', () => {
      expect(() =>
        throwIfFeatureAbsent(buildResponse(404), 'change proposals'),
      ).not.toThrow();
    });
  });

  describe('when a Community Edition server fails on a route it does mount', () => {
    it('lets the real error surface', () => {
      const response = buildResponse(502, { 'Packmind-Edition': 'oss' });

      expect(() =>
        throwIfFeatureAbsent(response, 'change proposals'),
      ).not.toThrow();
    });
  });
});
