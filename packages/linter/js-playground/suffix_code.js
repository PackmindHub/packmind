const util = require('util');

// Set maxArrayLength to null globally, so that all violations are printed
util.inspect.defaultOptions.maxArrayLength = null;

function processInput(sourceCode) {
  const violations = checkSourceCode(sourceCode);
  console.log(violations);
}

// Check if there are command line arguments
if (process.argv.length > 2) {
  // Command line arguments provided
  const sourceCode = process.argv.slice(2).join(' ');
  processInput(sourceCode);
} else {
  // No command line arguments, read from stdin
  let sourceCode = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => {
    sourceCode += chunk;
  });
  process.stdin.on('end', () => {
    processInput(sourceCode);
  });
}
