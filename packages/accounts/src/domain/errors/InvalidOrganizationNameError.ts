type InvalidOrganizationNameContext = {
  name: string;
};

export class InvalidOrganizationNameError extends Error {
  constructor(context: InvalidOrganizationNameContext) {
    super(`Invalid organization name: "${context.name}"`);
    this.name = 'InvalidOrganizationNameError';
    Object.setPrototypeOf(this, InvalidOrganizationNameError.prototype);
  }
}
