/** Which files are measured, and how they are bucketed. Shared by both collectors. */

const SPEC_PATTERN = /\.(spec|test)\.tsx?$/;
// Not hand-written product code. Nothing in this repository matches today, but
// the two collectors must agree on the rule or their totals silently diverge.
const EXCLUDED = ['node_modules/', 'dist/', 'build/', 'coverage/', 'tmp/'];

export const CATEGORIES = ['ts', 'spec.ts', 'tsx', 'spec.tsx'];

/** Category of a file, or null when the file is not measured. */
export function categoryOf(filePath) {
  if (EXCLUDED.some((prefix) => filePath.includes(prefix))) return null;
  if (filePath.endsWith('.d.ts')) return null; // ambient declarations, mostly generated
  const isTsx = filePath.endsWith('.tsx');
  if (!isTsx && !filePath.endsWith('.ts')) return null;
  if (SPEC_PATTERN.test(filePath)) return isTsx ? 'spec.tsx' : 'spec.ts';
  return isTsx ? 'tsx' : 'ts';
}
