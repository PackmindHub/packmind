'use strict';

const ts = require('typescript');

/**
 * `DomainExceptionFilter` maps a thrown value to a status by its `kind`; a value
 * without one answers 500. Mirrors `isDomainError` / `isInternalError` /
 * `isUpstreamError`: a literal `kind` from these families, a string `reason`,
 * and — for internal and upstream kinds — an `Error` instance.
 */
const DOMAIN_KINDS = new Set([
  'not_found',
  'forbidden',
  'invalid_input',
  'conflict',
  'unauthenticated',
  'rate_limited',
]);
const ERROR_ONLY_KINDS = new Set([
  'internal',
  'upstream_unavailable',
  'upstream_rate_limited',
]);

const UNCHECKABLE = ts.TypeFlags.Any | ts.TypeFlags.Unknown;

function members(type) {
  return type.isUnion() ? type.types : [type];
}

// Optional or nullable members are kept: at runtime they fail the guards.
function requiredPropertyType(checker, type, name) {
  const symbol = checker.getPropertyOfType(type, name);
  if (!symbol || symbol.flags & ts.SymbolFlags.Optional) return null;
  return checker.getTypeOfSymbol(symbol);
}

function extendsError(checker, type) {
  const seen = new Set();
  const visit = (current) => {
    if (seen.has(current)) return false;
    seen.add(current);
    // `isInternalError` narrows to `InternalError & Error`.
    if (current.isIntersection()) return current.types.some(visit);
    if (current.getSymbol()?.getName() === 'Error') return true;
    const target = current.target ?? current;
    if (!(target.objectFlags & ts.ObjectFlags.ClassOrInterface)) return false;
    return checker.getBaseTypes(target).some(visit);
  };
  return visit(type);
}

function carriesKnownKind(checker, type) {
  const kindType = requiredPropertyType(checker, type, 'kind');
  const reasonType = requiredPropertyType(checker, type, 'reason');
  if (!kindType || !reasonType) return false;

  const kinds = members(kindType);
  if (!kinds.every((t) => t.isStringLiteral())) return false;
  const isDomainKind = (t) => DOMAIN_KINDS.has(t.value);
  const isErrorOnlyKind = (t) => ERROR_ONLY_KINDS.has(t.value);
  if (!kinds.every((t) => isDomainKind(t) || isErrorOnlyKind(t))) return false;

  if (!members(reasonType).every((t) => t.flags & ts.TypeFlags.StringLike)) {
    return false;
  }

  return !kinds.some(isErrorOnlyKind) || extendsError(checker, type);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require thrown values to be errors that DomainExceptionFilter recognises by their `kind` and `reason`',
    },
    schema: [],
    messages: {
      missingKind:
        "Thrown value of type '{{type}}' is not an error DomainExceptionFilter recognises (a known `kind` and a string `reason`), so the API answers 500. Throw a class extending the package's DomainError base, PackmindInternalError or PackmindUpstreamError.",
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

        if (
          members(type).every((member) => carriesKnownKind(checker, member))
        ) {
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
