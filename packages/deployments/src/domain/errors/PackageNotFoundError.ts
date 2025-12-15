export class PackageNotFoundError extends Error {
  constructor(packageId: string) {
    super(`Package with id "${packageId}" was not found`);
    this.name = 'PackageNotFoundError';
    Object.setPrototypeOf(this, PackageNotFoundError.prototype);
  }
}
