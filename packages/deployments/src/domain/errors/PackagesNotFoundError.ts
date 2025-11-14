export class PackagesNotFoundError extends Error {
  public readonly unknownSlugs: string[];

  constructor(unknownSlugs: string[]) {
    const slugsList = unknownSlugs.map((slug) => `"${slug}"`).join(', ');
    const message =
      unknownSlugs.length === 1
        ? `Package ${slugsList} was not found`
        : `Packages ${slugsList} were not found`;
    super(message);
    this.name = 'PackagesNotFoundError';
    this.unknownSlugs = unknownSlugs;
    Object.setPrototypeOf(this, PackagesNotFoundError.prototype);
  }
}
