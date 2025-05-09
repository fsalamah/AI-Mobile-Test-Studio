# Test Output Directory

This directory contains output files generated during testing of the AI module. These files are used for analysis, debugging, and verification of the module's functionality.

## Contents

The test output includes:

- Transition analysis results
- Condensed recordings
- XPath repair reports
- Processing logs
- Performance metrics

## Usage

Test files are automatically generated when running the test utilities:

```bash
# Generate transition analysis output
node test-transition-analysis.js

# Generate recording condensing output
node test-condenser.js 

# Generate recording load/save test output
node test-recorder-loading.js
```

## Note

The contents of this directory (except for this README and .gitkeep) are excluded from version control via .gitignore to avoid cluttering the repository with test artifacts.