const util = require('util');

// Set maxArrayLength to null globally, so that all violations are printed
util.inspect.defaultOptions.maxArrayLength = null;

// This section will be replaced dynamically with program functions for each practice
// BEGIN_PROGRAM_FUNCTIONS
// END_PROGRAM_FUNCTIONS

// Map to store the practice IDs and their corresponding program functions
const practicePrograms = {
  // This section will be replaced dynamically with mappings
  // BEGIN_PROGRAM_MAPPINGS
  // END_PROGRAM_MAPPINGS
};

function processInput(input) {
  const sourceCode = input;

  // Execute each program and collect results
  const violationsMap = {};

  for (const practiceId in practicePrograms) {
    try {
      // Call the specific program function for this practice
      const violations = practicePrograms[practiceId](sourceCode);
      violationsMap[practiceId] = violations;
    } catch (error) {
      console.error(
        `Error executing program for practice ${practiceId}:`,
        error,
      );
      violationsMap[practiceId] = [];
    }
  }

  // Print the combined violations map
  console.log(JSON.stringify(violationsMap));
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
