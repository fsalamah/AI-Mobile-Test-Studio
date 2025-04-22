import { z } from "zod";

export const CONFIG = {
  API: {
    KEY: "AIzaSyB_8rkCNp8RAQkoYXK3KqMBtjJKG6KkDDs",
    BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/",
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
  MODEL:'gemini-2.0-flash',
};
