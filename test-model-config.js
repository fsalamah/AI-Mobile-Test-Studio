// Simple script to run the model configuration tests
import { runModelConfigTests } from './app/common/renderer/lib/ai/testModelConfig.js';

// Run tests and print results
(async () => {
  console.log('Testing model configuration prioritization...');
  try {
    const results = await runModelConfigTests();
    
    console.log('\n=== Test Summary ===');
    console.log(`Tests Passed: ${results.tests.length - results.failures.length}/${results.tests.length}`);
    
    if (results.failures.length > 0) {
      console.error('\n❌ Failed Tests:');
      results.failures.forEach(failure => {
        console.error(` - ${failure.name}: ${failure.error}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
})();