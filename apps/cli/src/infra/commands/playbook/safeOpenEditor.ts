import { openEditorForMessage } from '../../utils/editorMessage';
import { logErrorConsole } from '../../utils/consoleLogger';

export function safeOpenEditor(prefill: string): string | null {
  try {
    const result = openEditorForMessage(prefill);
    return result.length > 0 ? result : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logErrorConsole(`Failed to open editor: ${message}`);
    return null;
  }
}
