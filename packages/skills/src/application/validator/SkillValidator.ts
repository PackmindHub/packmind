import {
  SkillValidationError,
  SkillValidationErrorDetail,
} from '../errors/SkillValidationError';
import {
  ALLOWED_FRONTMATTER_FIELDS,
  SkillProperties,
} from '../../domain/SkillProperties';

const NAME_MAX_LENGTH = 64;
const DESCRIPTION_MAX_LENGTH = 1024;
const COMPATIBILITY_MAX_LENGTH = 500;

/**
 * Regular expression for valid skill names:
 * - Only lowercase alphanumeric characters and hyphens
 * - Must not start or end with hyphen
 * - Must not contain consecutive hyphens
 */
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validates skill metadata according to the Agent Skills specification.
 *
 * @see https://agentskills.io/specification
 */
export class SkillValidator {
  /**
   * Validates the skill metadata and returns validation errors.
   *
   * @param metadata - The parsed skill metadata to validate
   * @returns Array of validation error details (empty if valid)
   */
  validate(metadata: Partial<SkillProperties>): SkillValidationErrorDetail[] {
    const errors: SkillValidationErrorDetail[] = [];

    this.validateRequiredFields(metadata, errors);
    this.validateNameFormat(metadata, errors);
    this.validateDescriptionFormat(metadata, errors);
    this.validateCompatibilityFormat(metadata, errors);
    this.validateUnexpectedFields(metadata, errors);

    return errors;
  }

  /**
   * Validates the skill metadata and throws if invalid.
   *
   * @param metadata - The parsed skill metadata to validate
   * @throws {SkillValidationError} If validation fails
   */
  validateOrThrow(metadata: Partial<SkillProperties>): void {
    const errors = this.validate(metadata);

    if (errors.length > 0) {
      throw new SkillValidationError(errors);
    }
  }

  private validateRequiredFields(
    metadata: Partial<SkillProperties>,
    errors: SkillValidationErrorDetail[],
  ): void {
    if (!metadata.name) {
      errors.push({
        field: 'name',
        message: 'name field is missing',
      });
    }

    if (!metadata.description) {
      errors.push({
        field: 'description',
        message: 'description field is missing',
      });
    }
  }

  private validateNameFormat(
    metadata: Partial<SkillProperties>,
    errors: SkillValidationErrorDetail[],
  ): void {
    const { name } = metadata;

    if (!name) {
      return;
    }

    if (name.length > NAME_MAX_LENGTH) {
      errors.push({
        field: 'name',
        message: `name must not exceed ${NAME_MAX_LENGTH} characters`,
      });
    }

    if (/[A-Z]/.test(name)) {
      errors.push({
        field: 'name',
        message: 'name must contain only lowercase characters',
      });
    }

    if (name.startsWith('-') || name.endsWith('-')) {
      errors.push({
        field: 'name',
        message: 'name must not start or end with a hyphen',
      });
    }

    if (name.includes('--')) {
      errors.push({
        field: 'name',
        message: 'name must not contain consecutive hyphens',
      });
    }

    if (!NAME_PATTERN.test(name) && !errors.some((e) => e.field === 'name')) {
      errors.push({
        field: 'name',
        message:
          'name must contain only lowercase alphanumeric characters and hyphens',
      });
    }
  }

  private validateDescriptionFormat(
    metadata: Partial<SkillProperties>,
    errors: SkillValidationErrorDetail[],
  ): void {
    const { description } = metadata;

    if (!description) {
      return;
    }

    if (description.length > DESCRIPTION_MAX_LENGTH) {
      errors.push({
        field: 'description',
        message: `description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`,
      });
    }
  }

  private validateCompatibilityFormat(
    metadata: Partial<SkillProperties>,
    errors: SkillValidationErrorDetail[],
  ): void {
    const { compatibility } = metadata;

    if (!compatibility) {
      return;
    }

    if (compatibility.length > COMPATIBILITY_MAX_LENGTH) {
      errors.push({
        field: 'compatibility',
        message: `compatibility must not exceed ${COMPATIBILITY_MAX_LENGTH} characters`,
      });
    }
  }

  private validateUnexpectedFields(
    metadata: Partial<SkillProperties>,
    errors: SkillValidationErrorDetail[],
  ): void {
    const allowedFields = new Set<string>(ALLOWED_FRONTMATTER_FIELDS);
    const unexpectedFields = Object.keys(metadata).filter(
      (key) => !allowedFields.has(key),
    );

    if (unexpectedFields.length > 0) {
      errors.push({
        field: 'frontmatter',
        message: `unexpected fields in frontmatter: ${unexpectedFields.join(', ')}`,
      });
    }
  }
}
