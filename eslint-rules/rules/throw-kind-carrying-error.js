'use strict';

const ts = require('typescript');

/**
 * `DomainExceptionFilter` maps a thrown value to a status by its `kind`; a value
 * without one answers 500. Mirrors `isDomainError` / `isInternalError` /
 * `isUpstreamError`: a literal `kind` from these families plus a `reason`.
 */
const KNOWN_KINDS = new Set([
  'not_found',
  'forbidden',
  'invalid_input',
  'conflict',
  'unauthenticated',
  'internal',
  'upstream_unavailable',
  'upstream_rate_limited',
]);

const UNCHECKABLE = ts.TypeFlags.Any | ts.TypeFlags.Unknown;

function kindLiterals(checker, type) {
  const kind = checker.getPropertyOfType(type, 'kind');
  if (!kind) return null;
  const kindType = checker.getNonNullableType(checker.getTypeOfSymbol(kind));
  const members = kindType.isUnion() ? kindType.types : [kindType];
  return members.map((t) => (t.isStringLiteral() ? t.value : null));
}

function carriesKnownKind(checker, type) {
  const literals = kindLiterals(checker, type);
  if (!literals || literals.length === 0) return false;
  if (!literals.every((value) => value !== null && KNOWN_KINDS.has(value))) {
    return false;
  }
  return Boolean(checker.getPropertyOfType(type, 'reason'));
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require thrown values to carry a `kind` and `reason` that DomainExceptionFilter recognises',
    },
    schema: [],
    messages: {
      missingKind:
        "Thrown value of type '{{type}}' carries no recognised `kind`, so the API answers 500. Throw a class extending the package's DomainError base, PackmindInternalError or PackmindUpstreamError.",
    },
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    if (!services || !services.program) {
      throw new Error(
        'packmind/throw-kind-carrying-error needs type information: set parserOptions.projectService.',
      );
    }
    const checker = services.program.getTypeChecker();

    return {
      ThrowStatement(node) {
        if (!node.argument) return;
        const tsNode = services.esTreeNodeToTSNodeMap.get(node.argument);
        const type = checker.getTypeAtLocation(tsNode);

        // A rethrown `catch (error)` is `unknown`: whatever it is was typed
        // (or not) where it was first thrown.
        if (type.flags & UNCHECKABLE) return;

        const members = type.isUnion() ? type.types : [type];
        if (members.every((member) => carriesKnownKind(checker, member))) {
          return;
        }

        context.report({
          node: node.argument,
          messageId: 'missingKind',
          data: { type: checker.typeToString(type) },
        });
      },
    };
  },
};
