import { InvalidPageError } from './InvalidPageError';

describe('InvalidPageError', () => {
  it('is an instance of Error', () => {
    const err = new InvalidPageError(0);
    expect(err).toBeInstanceOf(Error);
  });

  it('has name InvalidPageError', () => {
    const err = new InvalidPageError(0);
    expect(err.name).toBe('InvalidPageError');
  });

  it('includes the page number in the message', () => {
    const err = new InvalidPageError(0);
    expect(err.message).toContain('0');
  });

  it('coerces non-numeric input to a string in the message', () => {
    const err = new InvalidPageError('abc');
    expect(err.message).toContain('abc');
  });
});
