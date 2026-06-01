import { PackmindError } from '../../../services/api/errors/PackmindError';
import { PackmindConflictError } from '../../../services/api/errors/PackmindConflictError';
import { NETWORK_ERROR_MESSAGE, getSubmitErrorMessage } from './errorMapping';

describe('getSubmitErrorMessage', () => {
  it('surfaces the backend message from a PackmindConflictError (409 already-linked-as-standard)', () => {
    const message =
      'Repository acme/foo is already linked as a standard Git repository in this organization';

    const error = new PackmindConflictError({
      status: 409,
      statusText: 'Conflict',
      data: { message },
    });

    expect(getSubmitErrorMessage(error)).toBe(message);
  });

  it('surfaces the backend message from a generic PackmindError', () => {
    const message = 'No marketplace.json descriptor was found in acme/foo';

    const error = new PackmindError({
      status: 400,
      statusText: 'Bad Request',
      data: { message },
    });

    expect(getSubmitErrorMessage(error)).toBe(message);
  });

  it('falls back to the connectivity message for a plain network error', () => {
    expect(
      getSubmitErrorMessage(
        new Error('Network Error: No response from server'),
      ),
    ).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('falls back to the connectivity message for non-object errors', () => {
    expect(getSubmitErrorMessage('boom')).toBe(NETWORK_ERROR_MESSAGE);
    expect(getSubmitErrorMessage(null)).toBe(NETWORK_ERROR_MESSAGE);
  });
});
