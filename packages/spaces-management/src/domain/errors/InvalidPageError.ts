export class InvalidPageError extends Error {
  constructor(page: unknown) {
    super(
      `Invalid page value: ${String(page)}. Page must be a positive integer.`,
    );
    this.name = 'InvalidPageError';
  }
}
