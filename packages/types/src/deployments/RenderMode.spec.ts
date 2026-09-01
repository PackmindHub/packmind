import {
  RenderMode,
  RENDER_MODE_ORDER,
  normalizeRenderModes,
} from './RenderMode';

describe('RenderMode', () => {
  describe('KIRO', () => {
    it('exposes KIRO as an enum value', () => {
      expect(RenderMode.KIRO).toBe('KIRO');
    });

    it('lists KIRO in RENDER_MODE_ORDER', () => {
      expect(RENDER_MODE_ORDER).toContain(RenderMode.KIRO);
    });

    describe('when requested', () => {
      it('keeps KIRO through normalization', () => {
        const normalized = normalizeRenderModes([RenderMode.KIRO]);
        expect(normalized).toContain(RenderMode.KIRO);
      });
    });
  });

  describe('CLAUDE_PLUGIN', () => {
    it('exposes CLAUDE_PLUGIN as an enum value', () => {
      expect(RenderMode.CLAUDE_PLUGIN).toBe('CLAUDE_PLUGIN');
    });

    it('places CLAUDE_PLUGIN directly after CLAUDE in RENDER_MODE_ORDER', () => {
      const claudeIndex = RENDER_MODE_ORDER.indexOf(RenderMode.CLAUDE);
      expect(RENDER_MODE_ORDER[claudeIndex + 1]).toBe(RenderMode.CLAUDE_PLUGIN);
    });

    describe('when requested', () => {
      it('keeps CLAUDE_PLUGIN through normalization', () => {
        const normalized = normalizeRenderModes([RenderMode.CLAUDE_PLUGIN]);
        expect(normalized).toContain(RenderMode.CLAUDE_PLUGIN);
      });
    });
  });
});
