const GEM25= 'gemini-2.5-flash-preview-04-17'
const GEM20= 'gemini-2.0-flash'

// Notice: This is a demo key - replace with your own API key for production use
const CONFIG = {
  API: {
    KEY: "AIzaSyB_8rkCNp8RAQkoYXK3KqMBtjJKG6KkDDs", // Replace with your API key in production
    BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/", // Default API base URL
    MODEL:"gemini-2.0-flash"
  },
  GENERATION: {
    seed: 988,
    temperature: 0,
    topP: 1,
    topK: 1,
  },
  ANALYSIS_RUNS: 1,
  DEBUG: true,
  DATA_PATH: "C:\\Users\\Faisa\\Desktop\\AI_TEST_PROJECT.json",
  PAGE_ID: "id_m9l81dph_wmm7f",
  MODEL:GEM25,
  POM_MODEL:{MODEL:GEM25,API: {
    KEY: "AIzaSyB_8rkCNp8RAQkoYXK3KqMBtjJKG6KkDDs",
    BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    MODEL:"gemini-2.0-flash"
  }},
  POM_GUIDE:"guide.txt",
  POM_PAGEBASE_CLASS: "PageBase.txt",
  CONDENSER: {
    enabled: true,              // Enable/disable inline condensing
    checkXml: true,             // Check XML source for changes
    checkScreenshot: true,      // Check screenshots for changes
    screenshotThreshold: 1.0,   // Similarity threshold (1.0 = exact match)
    defaultOutputSuffix: "_condensed"  // Default suffix for output files
  }
};

module.exports = { 
  CONFIG 
};