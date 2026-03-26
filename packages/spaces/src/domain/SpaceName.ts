import { InvalidSpaceNameError } from './errors/InvalidSpaceNameError';

export class SpaceName {
  static readonly MAX_LENGTH = 64;

  readonly value: string;

  constructor(name: string) {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      throw new InvalidSpaceNameError('name cannot be empty');
    }

    if (trimmed.length > SpaceName.MAX_LENGTH) {
      throw new InvalidSpaceNameError(
        `name must not exceed ${SpaceName.MAX_LENGTH} characters`,
      );
    }

    this.value = trimmed;
  }
}
