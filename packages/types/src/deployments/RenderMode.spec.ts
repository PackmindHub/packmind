import {
  RenderMode,
  RENDER_MODE_ORDER,
  normalizeRenderModes,
} from './RenderMode';

describe('RenderMode', () => {
  describe('CLAUDE_PLUGIN', () => {
    it('exposes CLAUDE_PLUGIN as an enum value', () => {
      expect(RenderMode.CLAUDE_PLUGIN).toBe('CLAUDE_PLUGIN');
    });

    it('places CLAUDE_PLUGIN directly after CLAUDE in RENDER_MODE_ORDER', () => {
      const claudeIndex = RENDER_MODE_ORDER.indexOf(RenderMode.CLAUDE);
      expect(RENDER_MODE_ORDER[claudeIndex + 1]).toBe(RenderMode.CLAUDE_PLUGIN);
    });

    it('keeps CLAUDE_PLUGIN through normalization when requested', () => {
      const normalized = normalizeRenderModes([RenderMode.CLAUDE_PLUGIN]);
      expect(normalized).toContain(RenderMode.CLAUDE_PLUGIN);
    });
  });
});
