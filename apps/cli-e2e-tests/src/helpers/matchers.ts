// eslint-disable-next-line no-control-regex
const stripAnsi = (str: string) => str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '');

expect.extend({
  toMatchOutput(received: string, expected: string | Array<string>) {
    const clean = stripAnsi(received);
    const expectedLines =
      typeof expected === 'string' ? expected.split('\n') : expected;

    try {
      expect(clean.split('\n')).toEqual(
        expect.arrayContaining(
          expectedLines.map((line) => expect.stringContaining(line)),
        ),
      );
      return {
        pass: true,
        message: 'Output matches',
      };
    } catch (err) {
      return {
        pass: false,
        message: () => (err as Error).message,
      };
    }
  },
});
