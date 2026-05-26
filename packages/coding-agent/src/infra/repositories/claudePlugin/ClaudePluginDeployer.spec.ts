import { ClaudePluginDeployer } from './ClaudePluginDeployer';

describe('ClaudePluginDeployer', () => {
  describe('constructor', () => {
    it('instantiates without throwing', () => {
      expect(() => new ClaudePluginDeployer()).not.toThrow();
    });
  });
});
