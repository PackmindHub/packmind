import { wrapText } from './PromptUtils';

describe('wrapText', () => {
  it('wraps text at specified length with line breaks', () => {
    const lines = wrapText(
      'Hello this is a long text that should be wrapped',
      10,
    );

    expect(lines).toBe(`Hello this
is a long
text that
should be
wrapped`);
  });
});
