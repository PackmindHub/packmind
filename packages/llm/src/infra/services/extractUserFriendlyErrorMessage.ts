/**
 * Provider SDKs tend to stringify the whole HTTP body into `error.message`,
 * with the status code in front of a JSON payload, e.g.:
 * - Anthropic: "401 {\"type\":\"error\",\"error\":{\"type\":\"not_found_error\",\"message\":\"model: claude-xxx\"}}"
 * - Google: "400 {\"error\":{\"code\":400,\"message\":\"API key not valid\"}}"
 */
export function extractUserFriendlyErrorMessage(error: Error | null): string {
  if (!error) {
    return 'Unknown error';
  }

  const message = error.message;

  const jsonStartIndex = message.indexOf('{');
  if (jsonStartIndex !== -1) {
    try {
      const jsonPart = message.slice(jsonStartIndex);
      const parsed = JSON.parse(jsonPart);

      if (parsed.error?.message) {
        if (parsed.error.type) {
          return `${parsed.error.type}: ${parsed.error.message}`;
        }
        return parsed.error.message;
      }

      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      // JSON parsing failed, continue with raw message
    }
  }

  return message;
}
