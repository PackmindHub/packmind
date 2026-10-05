import path from 'node:path';
import { RuleTester } from 'eslint';
import type { Rule } from 'eslint';
import tseslint from 'typescript-eslint';
// The rule is authored as CommonJS; default import resolves to module.exports.
import rule from './throw-kind-carrying-error';

const fixtureDir = path.join(__dirname, 'fixtures/throw-kind-carrying-error');
const filename = path.join(fixtureDir, 'file.ts');

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      projectService: true,
      tsconfigRootDir: fixtureDir,
    },
  },
});

const imports = `import {
  PackageError,
  PackageNotFoundError,
  PackmindInternalError,
  InvalidPasswordError,
  TooManyAttemptsError,
  StringKindError,
  UnknownKindError,
  KindWithoutReasonError,
  NullableKindError,
  OptionalKindError,
  NumericReasonError,
  OptionalReasonError,
  NullableReasonError,
  DomainErrorShape,
  InternalErrorShape,
} from './errors';
declare const pkg: { id: string } | undefined;
`;

ruleTester.run(
  'throw-kind-carrying-error',
  rule as unknown as Rule.RuleModule,
  {
    valid: [
      // Subclass inheriting kind and reason from the package base, across files.
      {
        code: `${imports}if (!pkg) throw new PackageNotFoundError();`,
        filename,
      },
      {
        code: `${imports}throw new PackageError('conflict', 'package_slug_taken', 'Taken.');`,
        filename,
      },
      {
        code: `${imports}throw new PackmindInternalError('lost', 'Release vanished');`,
        filename,
      },
      // A throttle the caller earned is a domain kind.
      {
        code: `${imports}throw new TooManyAttemptsError();`,
        filename,
      },
      // A rethrown catch variable is unknown: typed where it was first thrown.
      {
        code: `${imports}try { void pkg; } catch (error) { throw error; }`,
        filename,
      },
      // What `isDomainError` / `isInternalError` narrow a caught value to.
      {
        code: `${imports}declare const e: DomainErrorShape | (InternalErrorShape & Error); throw e;`,
        filename,
      },
      // Every member of a union carries a kind.
      {
        code: `${imports}declare const e: PackageNotFoundError | PackmindInternalError; throw e;`,
        filename,
      },
    ],
    invalid: [
      // Lock the wording.
      {
        code: `${imports}throw new Error('Package not found');`,
        filename,
        errors: [
          {
            message:
              "Thrown value of type 'Error' is not an error DomainExceptionFilter recognises (a known `kind` and a string `reason`), so the API answers 500. Throw a class extending the package's DomainError base, PackmindInternalError or PackmindUpstreamError.",
          },
        ],
      },
      {
        code: `${imports}throw Error('NO_CHANGES_DETECTED');`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      // Kindless through a parent declared in another file.
      {
        code: `${imports}throw new InvalidPasswordError();`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      // A wide `string` kind is not one the filter can trust.
      {
        code: `${imports}throw new StringKindError();`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      {
        code: `${imports}throw new UnknownKindError();`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      {
        code: `${imports}throw new KindWithoutReasonError();`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      // One kindless member spoils the union.
      {
        code: `${imports}declare const e: PackageNotFoundError | Error; throw e;`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      // The guards reject a null or missing kind, so stripping nullability
      // would let these through.
      {
        code: `${imports}throw new NullableKindError();`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      {
        code: `${imports}throw new OptionalKindError();`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      // The guards require `typeof reason === 'string'`.
      {
        code: `${imports}throw new NumericReasonError();`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      {
        code: `${imports}throw new OptionalReasonError();`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      {
        code: `${imports}throw new NullableReasonError();`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      // isInternalError and isUpstreamError also require an Error instance.
      {
        code: `${imports}throw { kind: 'upstream_unavailable' as const, reason: 'timeout' };`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      {
        code: `${imports}throw { kind: 'internal' as const, reason: 'lost' };`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
      {
        code: `${imports}throw 'boom';`,
        filename,
        errors: [{ messageId: 'missingKind' }],
      },
    ],
  },
);
