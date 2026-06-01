import {
  GENERIC_SUBMIT_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  getSubmitErrorMessage,
} from './errorMapping';

describe('getSubmitErrorMessage', () => {
  it('surfaces the backend message verbatim (e.g. the already-linked-as-standard conflict)', () => {
    const message =
      'Repository acme/foo is already linked as a standard Git repository in this organization';

    const error = {
      response: { status: 409, data: { error: 'Conflict', message } },
    };

    expect(getSubmitErrorMessage(error)).toBe(message);
  });

  it('joins NestJS validation message arrays', () => {
    const error = {
      response: {
        status: 400,
        data: { message: ['name should not be empty', 'repo is required'] },
      },
    };

    expect(getSubmitErrorMessage(error)).toBe(
      'name should not be empty repo is required',
    );
  });

  it('falls back to the network message when there is no response', () => {
    expect(getSubmitErrorMessage(new Error('Network Error'))).toBe(
      NETWORK_ERROR_MESSAGE,
    );
  });

  it('falls back to the network message for a non-object error', () => {
    expect(getSubmitErrorMessage('boom')).toBe(NETWORK_ERROR_MESSAGE);
    expect(getSubmitErrorMessage(null)).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('falls back to a generic message when the server responds without a message', () => {
    const error = { response: { status: 500, data: {} } };

    expect(getSubmitErrorMessage(error)).toBe(GENERIC_SUBMIT_ERROR_MESSAGE);
  });
});
