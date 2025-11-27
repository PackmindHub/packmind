/**
 * Extracts a user-friendly error message from provider SDK errors.
 * Handles different error formats from OpenAI, Anthropic, Gemini, and Azure.
 *
 * Provider error messages often contain JSON with status codes, e.g.:
 * - Anthropic: "401 {\"type\":\"error\",\"error\":{\"type\":\"not_found_error\",\"message\":\"model: claude-xxx\"}}"
 * - Google: "400 {\"error\":{\"code\":400,\"message\":\"API key not valid\"}}"
 */
export function extractUserFriendlyErrorMessage(error: Error | null): string {
  if (!error) {
    return 'Unknown error';
  }

  const message = error.message;

  // Try to extract JSON from message (e.g., "401 {...json...}")
  const jsonStartIndex = message.indexOf('{');
  if (jsonStartIndex !== -1) {
    try {
      const jsonPart = message.slice(jsonStartIndex);
      const parsed = JSON.parse(jsonPart);

      // Anthropic/OpenAI format: { error: { type?: "...", message: "..." } }
      if (parsed.error?.message) {
        // Include error type if available for better context
        if (parsed.error.type) {
          return `${parsed.error.type}: ${parsed.error.message}`;
        }
        return parsed.error.message;
      }

      // Direct message format: { message: "..." }
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      // JSON parsing failed, continue with raw message
    }
  }

  // Return the original message if no JSON found
  return message;
}
