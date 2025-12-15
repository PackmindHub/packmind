export class NoPackageSlugsProvidedError extends Error {
  constructor() {
    super(
      'No package slugs provided. Please specify at least one package slug.',
    );
    this.name = 'NoPackageSlugsProvidedError';
    Object.setPrototypeOf(this, NoPackageSlugsProvidedError.prototype);
  }
}
