import { RuleTester } from 'eslint';
import type { Rule } from 'eslint';
// The rule is authored as CommonJS; default import resolves to module.exports.
import rule from './use-case-filename';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
});

// Helper: build a packages-scoped path so the rule's scope gate passes.
const p = (name: string) =>
  `/repo/packages/example/src/application/useCases/${name}`;

ruleTester.run('use-case-filename', rule as unknown as Rule.RuleModule, {
  valid: [
    // Conformant PascalCase file + class.
    {
      code: 'export class AddGitRepoUseCase {}',
      filename: p('addGitRepo/AddGitRepoUseCase.ts'),
    },
    {
      code: 'const x = 1;',
      filename: p('addGitRepo/AddGitRepoUseCase.spec.ts'),
    },
    // Helpers with no exported use-case class.
    { code: 'export const x = 1;', filename: p('index.ts') },
    { code: 'export function helper() {}', filename: p('utils.ts') },
    // Error classes are not use cases (by superclass or by name).
    {
      code: 'export class FooError extends Error {}',
      filename: p('getFoo/GetFooUseCase.ts'),
    },
    {
      code: 'export class CliLoginCodeExpiredError {}',
      filename: p('getFoo/GetFooUseCase.ts'),
    },
    // Non-exported classes are ignored.
    { code: 'class Helper {}', filename: p('getFoo/GetFooUseCase.ts') },
    // Out of scope: apps/* are never checked, even for non-conformant names.
    {
      code: 'export class CommandDiffStrategy {}',
      filename:
        '/repo/apps/cli/src/application/useCases/diffStrategies/CommandDiffStrategy.ts',
    },
    {
      code: 'const x = 1;',
      filename: '/repo/apps/cli/src/application/useCases/foo.usecase.ts',
    },
  ],
  invalid: [
    // Legacy ".usecase" filename — lock the exact wording.
    {
      code: 'const x = 1;',
      filename: p('addGitRepo/addGitRepo.usecase.ts'),
      errors: [
        {
          message:
            'Use-case file "addGitRepo.usecase.ts" uses the legacy ".usecase" suffix. Rename it to PascalCase ending in "UseCase", e.g. "AddGitRepoUseCase.ts".',
        },
      ],
    },
    // Review #2: .tsx extension must be preserved in the suggestion.
    {
      code: 'const x = 1;',
      filename: p('widget/widget.usecase.tsx'),
      errors: [
        {
          message:
            'Use-case file "widget.usecase.tsx" uses the legacy ".usecase" suffix. Rename it to PascalCase ending in "UseCase", e.g. "WidgetUseCase.tsx".',
        },
      ],
    },
    // Mis-cased filename: Usecase -> UseCase.
    {
      code: 'const x = 1;',
      filename: p('captureRecipe/CaptureRecipeUsecase.ts'),
      errors: [
        {
          message:
            'Use-case file "CaptureRecipeUsecase.ts" must end in "UseCase" (capital "C"), not "Usecase". Rename it to "CaptureRecipeUseCase.ts".',
        },
      ],
    },
    {
      code: 'const x = 1;',
      filename: p('captureRecipe/CaptureRecipeUsecase.spec.ts'),
      errors: [{ messageId: 'filenameCasing' }],
    },
    // Mis-cased exported class.
    {
      code: 'export class CaptureRecipeUsecase {}',
      filename: p('captureRecipe/Conformant.ts'),
      errors: [{ messageId: 'classCasing' }],
    },
    // Exported use-case class missing the UseCase suffix (bare).
    {
      code: 'export class CommitToGit {}',
      filename: p('commitToGit/Conformant.ts'),
      errors: [
        {
          message:
            'Use-case class "CommitToGit" must be PascalCase ending in "UseCase". Rename it to "CommitToGitUseCase".',
        },
      ],
    },
    {
      code: 'export default class CommitToGit {}',
      filename: p('commitToGit/Conformant.ts'),
      errors: [{ messageId: 'classMissingSuffix' }],
    },
  ],
});
