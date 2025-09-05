// The program processes an abstract syntax tree (AST) to identify violations of naming conventions specifically related to interface
// declarations. It aims to detect interfaces that do not follow the convention of starting their names with the letter 'I'. The algorithm
// recursively traverses each node in the AST, checking for nodes representing interface declarations. For each interface node found, it looks
// for a child node of type 'type_identifier' to retrieve the interface's name. If the name does not start with 'I', the program records the
// line number of that interface declaration as a violation. The result is a list of line numbers where the naming convention is not adhered
// to.

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
function checkSourceCode(ast) {
  let violationLines = [];

  // Helper function to traverse the AST recursively
  function traverse(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check if the current node is an interface declaration
    if (node.type === 'interface_declaration') {
      // Find the child node that is of type 'type_identifier'
      const typeIdentifierNode = node.children.find(
        (child) => child.type === 'type_identifier',
      );
      if (typeIdentifierNode) {
        // Check if the interface name starts with 'I'
        if (!typeIdentifierNode.text.startsWith('I')) {
          // Not following convention, record the line number of this node
          violationLines.push(node.line);
        }
      }
    }

    // Traverse child nodes recursively
    if (Array.isArray(node.children)) {
      node.children.forEach(traverse);
    }
  }

  // Start traversal from the root of the AST
  traverse(ast);

  return violationLines;
}
