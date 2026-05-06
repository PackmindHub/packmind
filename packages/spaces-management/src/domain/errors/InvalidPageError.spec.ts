import { InvalidPageError } from './InvalidPageError';

describe('InvalidPageError', () => {
  it('is an Error subclass with the right name and message', () => {
    const err = new InvalidPageError(0);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('InvalidPageError');
    expect(err.message).toContain('0');
  });

  it('coerces non-numeric input to a string in the message', () => {
    const err = new InvalidPageError('abc');
    expect(err.message).toContain('abc');
  });
});
