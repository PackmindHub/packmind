import { extractUserFriendlyErrorMessage } from './extractUserFriendlyErrorMessage';

describe('extractUserFriendlyErrorMessage', () => {
  describe('with null input', () => {
    it('returns Unknown error', () => {
      const result = extractUserFriendlyErrorMessage(null);

      expect(result).toBe('Unknown error');
    });
  });

  describe('with Anthropic error format containing type', () => {
    it('returns error type prefixed to message', () => {
      const error = new Error(
        '404 {"type":"error","error":{"type":"not_found_error","message":"model: claude-haiku-4-5-20251001zeze"},"request_id":"req_123"}',
      );

      const result = extractUserFriendlyErrorMessage(error);

      expect(result).toBe(
        'not_found_error: model: claude-haiku-4-5-20251001zeze',
      );
    });
  });

  describe('with Anthropic error format without type', () => {
    it('returns message only', () => {
      const error = new Error(
        '401 {"type":"error","error":{"message":"invalid x-api-key"}}',
      );

      const result = extractUserFriendlyErrorMessage(error);

      expect(result).toBe('invalid x-api-key');
    });
  });

  describe('with Google error format', () => {
    it('returns error message from nested error object', () => {
      const error = new Error(
        '400 {"error":{"code":400,"message":"API key not valid"}}',
      );

      const result = extractUserFriendlyErrorMessage(error);

      expect(result).toBe('API key not valid');
    });
  });

  describe('with direct message format', () => {
    it('returns direct message property', () => {
      const error = new Error('{"message":"Something went wrong"}');

      const result = extractUserFriendlyErrorMessage(error);

      expect(result).toBe('Something went wrong');
    });
  });

  describe('with non-JSON error message', () => {
    it('returns original message', () => {
      const error = new Error('Network connection failed');

      const result = extractUserFriendlyErrorMessage(error);

      expect(result).toBe('Network connection failed');
    });
  });

  describe('with invalid JSON in message', () => {
    it('returns original message', () => {
      const error = new Error('500 {invalid json}');

      const result = extractUserFriendlyErrorMessage(error);

      expect(result).toBe('500 {invalid json}');
    });
  });

  describe('with Anthropic authentication error', () => {
    it('returns error type prefixed to message', () => {
      const error = new Error(
        '401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}',
      );

      const result = extractUserFriendlyErrorMessage(error);

      expect(result).toBe('authentication_error: invalid x-api-key');
    });
  });

  describe('with rate limit error', () => {
    it('returns error type prefixed to message', () => {
      const error = new Error(
        '429 {"type":"error","error":{"type":"rate_limit_error","message":"Rate limit exceeded"}}',
      );

      const result = extractUserFriendlyErrorMessage(error);

      expect(result).toBe('rate_limit_error: Rate limit exceeded');
    });
  });
});
