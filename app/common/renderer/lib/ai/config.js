import { z } from "zod";
const GEM25= 'gemini-2.5-flash-preview-04-17'
const GEM20= 'gemini-2.0-flash'
// Notice: This is a demo key - replace with your own API key for production use
export const CONFIG = {
  API: {
    KEY: "YOUR_API_KEY", // Replace with your API key in production
    BASE_URL: "https://api.openai.com/v1", // Default OpenAI API base URL
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
  //MODEL:'gemini-2.0-flash',
  MODEL:GEM25,
  POM_MODEL:{MODEL:GEM25,API: {
    KEY: "AIzaSyB_8rkCNp8RAQkoYXK3KqMBtjJKG6KkDDs",
    BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  }},
  POM_GUIDE:"guide.txt",
  POM_PAGEBASE_CLASS: "PageBase.txt"
};
