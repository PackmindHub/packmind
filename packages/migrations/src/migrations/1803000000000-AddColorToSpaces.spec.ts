import { hashNameToSpaceColor } from './1803000000000-AddColorToSpaces';

describe('hashNameToSpaceColor', () => {
  describe('when matching the frontend getSpaceColorPalette behavior', () => {
    const SPACE_COLOR_PALETTES = [
      'red',
      'orange',
      'yellow',
      'green',
      'teal',
      'blue',
      'cyan',
      'purple',
      'pink',
    ] as const;

    function getSpaceColorPaletteFrontend(name: string): string {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = Math.trunc(hash * 31 + (name.codePointAt(i) ?? 0));
      }
      return SPACE_COLOR_PALETTES[Math.abs(hash) % SPACE_COLOR_PALETTES.length];
    }

    const sampleNames = [
      'Global',
      'oddity',
      'security',
      'Security Connections',
      'My Space',
      'Acme Corp',
      'Backend',
      '日本語',
      '',
    ];

    it.each(sampleNames)(
      'returns the same color as the frontend for %p',
      (name) => {
        expect(hashNameToSpaceColor(name)).toBe(
          getSpaceColorPaletteFrontend(name),
        );
      },
    );
  });
});
