import { AbstractStartTrialAgentPage } from './AbstractStartTrialAgentPage';
import { IMcpConfig } from '../../domain/pages';

export class ClaudeStartTrialAgentPage extends AbstractStartTrialAgentPage {
  async getMcpConfig(): Promise<IMcpConfig> {
    // Claude CLI command format:
    // claude mcp add --transport http packmind ${url} --header "Authorization: Bearer ${token}"
    const textarea = this.page.locator('textarea').first();
    const command = await textarea.inputValue();

    const urlMatch = command.match(/packmind\s+(https?:\/\/[^\s]+)/);
    const tokenMatch = command.match(/Bearer\s+([^"]+)/);

    if (!urlMatch || !tokenMatch) {
      throw new Error(
        `Could not parse MCP config from CLI command: ${command}`,
      );
    }

    return { url: urlMatch[1], token: tokenMatch[1] };
  }

  expectedUrl(): RegExp {
    return /\/start-trial\/claude\?/;
  }
}
