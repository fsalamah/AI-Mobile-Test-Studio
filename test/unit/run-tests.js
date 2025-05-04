// run-tests.js
// Simple test runner for our unit tests

import Mocha from 'mocha';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a new Mocha instance
const mocha = new Mocha({
  ui: 'bdd',
  timeout: 5000
});

// Tests to run
const tests = [
  'centralized-xpath-evaluation.js',
  'centralized-xpath-evaluation.spec.js' // Re-enabled for testing
];

// Add each test file to Mocha
for (const test of tests) {
  mocha.addFile(path.join(__dirname, test));
}

// Run the tests
mocha.run(failures => {
  process.exitCode = failures ? 1 : 0;
});