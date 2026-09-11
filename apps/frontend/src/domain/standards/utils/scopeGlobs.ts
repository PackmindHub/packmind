/**
 * Reading a standard's scope the way the deployers read it.
 *
 * A scope is a comma-separated list of globs, and what is written in it ends
 * up verbatim in the `globs` frontmatter of the rule files Packmind writes.
 * An agent matches those against file paths, so a scope that is not a pattern
 * matches nothing, silently: the standard is distributed, the file is there,
 * and it never applies. Standards generated before the generator was fixed
 * carry scopes like `All typescript rules in the spec folder`, which is a
 * sentence about files rather than a pattern for them.
 */

/**
 * Split a scope into its individual globs.
 *
 * The same rule as `splitScopeGlobs` in `packages/coding-agent`, which is what
 * the deployers use to write the frontmatter: commas separate globs, except
 * inside a brace group, where a `{ts,tsx}` extension list has commas of its
 * own. Duplicated rather than imported, since that one lives in a backend
 * infrastructure package.
 */
export function splitScopeGlobs(scope: string): string[] {
  const globs: string[] = [];
  let current = '';
  let braceDepth = 0;

  for (const char of scope) {
    if (char === '{') {
      braceDepth++;
      current += char;
    } else if (char === '}') {
      braceDepth--;
      current += char;
    } else if (char === ',' && braceDepth === 0) {
      if (current.trim()) globs.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) globs.push(current.trim());

  return globs;
}

/**
 * The globs of this scope that cannot match a path, so nothing reading them
 * will ever apply the standard.
 *
 * Whitespace is the test, and deliberately the only one. A path can contain a
 * space, which is why this reports rather than forbids, but a glob with a
 * space in it is a sentence in every case seen so far, and the false positive
 * costs a line of explanation while the false negative costs a standard that
 * quietly never applies.
 *
 * The stronger test was tried and dropped: flagging a glob with none of
 * `* ? / . [ {` also catches `Dockerfile` and `Makefile`, which are real
 * files, and being wrong about those teaches a reader to ignore the warning.
 */
export function unmatchableScopeGlobs(scope: string): string[] {
  return splitScopeGlobs(scope).filter((glob) => /\s/.test(glob));
}
