// The program walks a JavaScript AST looking for test setup/teardown mismatches.  Here's how it works:
//
// 1. It keeps a list of violation line
// numbers.
// 2. Helper A scans a beforeEach block for statements of the form
//    "await X.initialize()" and collects each X's name.
// 3.
// Helper B scans an afterEach block for statements of the form
//    "await X.destroy()" and can answer whether a given X was torn down.
// 4. A
// scope‐processor examines a flat list of AST nodes:
//    • It pulls out all beforeEach calls, records their source line and the list of
// initialized bases.
//    • It collects all afterEach nodes.
//    • For each beforeEach entry, it checks that every initialized base name has
// a matching destroy call in at least one afterEach.
//    • If any base is never destroyed, it records the beforeEach line as a violation.
// 5. The program first processes the top‐level AST, then does a DFS to find each describe block, extracting its inner statements and
// reapplying the same scope logic.
// 6. Finally, it returns a sorted, de-duplicated list of offending line numbers.

/* eslint-disable @typescript-eslint/no-unused-vars */
function checkSourceCode(ast) {
  const violations = [];

  // Helper to extract initialize base names from a statement block
  function getInitializeBaseNames(statementBlock) {
    const bases = [];
    if (!statementBlock || !statementBlock.children) return bases;
    for (const stmt of statementBlock.children) {
      if (!stmt || !stmt.children) continue;
      const awaitExpr = stmt.children.find(
        (c) => c.type === 'await_expression',
      );
      if (!awaitExpr || !awaitExpr.children) continue;
      const callExpr = awaitExpr.children.find(
        (c) => c.type === 'call_expression',
      );
      if (!callExpr || !callExpr.children) continue;
      const memberExpr = callExpr.children.find(
        (c) => c.type === 'member_expression',
      );
      if (!memberExpr || !memberExpr.children) continue;
      const prop = memberExpr.children.find(
        (c) => c.type === 'property_identifier' && c.text === 'initialize',
      );
      if (prop) {
        const base = memberExpr.children.find((c) => c.type === 'identifier');
        if (base && base.text) {
          bases.push(base.text);
        }
      }
    }
    return bases;
  }

  // Helper to check if a destroy call for a given base exists in an afterEach node
  function hasDestroyCall(afterNode, baseName) {
    if (!afterNode || !afterNode.children) return false;
    const callExpr = afterNode.children.find(
      (c) => c.type === 'call_expression',
    );
    if (!callExpr) return false;
    const args =
      callExpr.children &&
      callExpr.children.find((c) => c.type === 'arguments');
    if (!args || !args.children) return false;
    const arrow = args.children.find((c) => c.type === 'arrow_function');
    if (!arrow || !arrow.children) return false;
    const stmtBlock = arrow.children.find((c) => c.type === 'statement_block');
    if (!stmtBlock || !stmtBlock.children) return false;
    // scan for await baseName.destroy()
    for (const stmt of stmtBlock.children) {
      if (!stmt || !stmt.children) continue;
      const awaitExpr = stmt.children.find(
        (c) => c.type === 'await_expression',
      );
      if (!awaitExpr || !awaitExpr.children) continue;
      const callExpr2 = awaitExpr.children.find(
        (c) => c.type === 'call_expression',
      );
      if (!callExpr2 || !callExpr2.children) continue;
      const memberExpr = callExpr2.children.find(
        (c) => c.type === 'member_expression',
      );
      if (!memberExpr || !memberExpr.children) continue;
      const prop = memberExpr.children.find(
        (c) => c.type === 'property_identifier' && c.text === 'destroy',
      );
      if (prop) {
        const base = memberExpr.children.find((c) => c.type === 'identifier');
        if (base && base.text === baseName) {
          return true;
        }
      }
    }
    return false;
  }

  // Process a flat scope of AST nodes for beforeEach/afterEach matching
  function processScope(nodes) {
    const beforeEachInfos = [];
    const afterEachNodes = [];
    // Collect beforeEach and afterEach nodes
    for (const node of nodes || []) {
      if (!node || node.type !== 'expression_statement' || !node.children)
        continue;
      const callExpr = node.children.find((c) => c.type === 'call_expression');
      if (!callExpr || !callExpr.children) continue;
      const id = callExpr.children[0];
      if (!id || id.type !== 'identifier') continue;
      if (id.text === 'beforeEach') {
        // extract statement block
        const args = callExpr.children.find((c) => c.type === 'arguments');
        const arrow =
          args &&
          args.children &&
          args.children.find((c) => c.type === 'arrow_function');
        const stmtBlock =
          arrow &&
          arrow.children &&
          arrow.children.find((c) => c.type === 'statement_block');
        const bases = getInitializeBaseNames(stmtBlock);
        beforeEachInfos.push({ line: callExpr.line, bases });
      } else if (id.text === 'afterEach') {
        afterEachNodes.push(node);
      }
    }
    // For each beforeEach, check matching destroy calls
    for (const info of beforeEachInfos) {
      if (!info.bases.length) continue;
      // if any base has no matching destroy, it's a violation
      const missing = info.bases.some((base) => {
        return !afterEachNodes.some((afterNode) =>
          hasDestroyCall(afterNode, base),
        );
      });
      if (missing) {
        violations.push(info.line);
      }
    }
  }

  // DFS to find describe block children arrays
  const describeBlocks = [];
  function dfs(node) {
    if (!node || !node.children) return;
    if (
      node.type === 'call_expression' &&
      node.children[0] &&
      node.children[0].text === 'describe'
    ) {
      const args = node.children.find((c) => c.type === 'arguments');
      const arrow =
        args &&
        args.children &&
        args.children.find((c) => c.type === 'arrow_function');
      const stmtBlock =
        arrow &&
        arrow.children &&
        arrow.children.find((c) => c.type === 'statement_block');
      if (stmtBlock && stmtBlock.children) {
        describeBlocks.push(stmtBlock.children);
      }
    }
    for (const child of node.children) {
      dfs(child);
    }
  }

  // Top-level scope
  const topNodes = ast && ast.children ? ast.children : [];
  processScope(topNodes);
  // Find and process each describe scope
  for (const node of topNodes) {
    dfs(node);
  }
  for (const block of describeBlocks) {
    processScope(block);
  }

  // Remove duplicates and sort
  return Array.from(new Set(violations)).sort((a, b) => a - b);
}
