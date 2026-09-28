// `logErrorConsole` records to `~/.packmind/error.log`, so any spec touching
// an error path would write to the home directory of whoever runs the suite.
// Mocked for every spec by default; the ones that exercise the log opt back in
// with `jest.unmock`.
jest.mock('./src/infra/utils/errorLog');
